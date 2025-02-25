# .gitignore

```
.cache
.local
.npm
.env
.ash_history
/docker-compose.override.yml
pbsk.code-workspace

```

# .npmrc

```
# .npmrc
engine-strict=true
```

# .vscode/tasks.json

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Initialize Project",
            "type": "shell",
            "command": "[ -f .env.example ] && cp -n .env.example .env || echo '.env.example not found'; [ -f docker-compose.override.yml.example ] && cp -n docker-compose.override.yml.example docker-compose.override.yml || echo 'docker-compose.override.yml.example not found'",
            "problemMatcher": [],
            "group": "none"
        },
        {
            "label": "Create Traefik Network",
            "type": "shell",
            "command": "docker network create traefik_default || true",
            "problemMatcher": []
        },
        {
            "label": "Start Docker Containers",
            "type": "shell",
            "command": "docker compose up -d",
            "dependsOn": ["Create Traefik Network"],
            "problemMatcher": []
        },
        {
            "label": "Install Frontend Dependencies",
            "type": "shell",
            "command": "cd sk && bun install",
            "dependsOn": ["Start Docker Containers"],
            "problemMatcher": []
        },
        {
            "label": "Install Go Tools",
            "type": "shell",
            "command": "go install github.com/cortesi/modd/cmd/modd@latest",
            "dependsOn": ["Install Frontend Dependencies"],
            "problemMatcher": []
        },
        {
            "label": "Start Backend Dev Server",
            "type": "shell",
            "command": "cd pb && ${HOME}/go/bin/modd",
            "dependsOn": ["Install Go Tools"],
            "isBackground": true,
            "presentation": {
                "reveal": "always",
                "panel": "new"
            },
            "problemMatcher": {
                "pattern": {
                    "regexp": ".",
                    "file": 1,
                    "location": 2,
                    "message": 3
                },
                "background": {
                    "activeOnStart": true,
                    "beginsPattern": ".",
                    "endsPattern": "."
                }
            }
        },
        {
            "label": "Start Frontend Dev Server",
            "type": "shell",
            "command": "cd sk && bun run dev",
            "dependsOn": ["Start Backend Dev Server"],
            "isBackground": true,
            "presentation": {
                "reveal": "always",
                "panel": "new"
            },
            "problemMatcher": {
                "pattern": {
                    "regexp": ".",
                    "file": 1,
                    "location": 2,
                    "message": 3
                },
                "background": {
                    "activeOnStart": true,
                    "beginsPattern": ".",
                    "endsPattern": "."
                }
            }
        },
        {
            "label": "Start Development Environment",
            "dependsOn": ["Start Frontend Dev Server"],
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "runOptions": {
                "runOn": "folderOpen"
            }
        }
    ]
}
```

# docker-compose.override.yml.example

```example
# version: "3.5"

services:
  sk:
    # for live development
    command: sh -c "bun install && bun run dev -- --host 0.0.0.0"
    expose:
      - 5173
    # labels for traefik reverse proxying. Move to "pb" or "sk" depending where you're doing live development
    labels:
      - traefik.enable=true
      - traefik.http.routers.${COMPOSE_PROJECT_NAME}.rule=Host(`${HTTP_HOSTNAME}`)
      - traefik.docker.network=traefik_default
    networks:
      - traefik_default
      - default
  # uncomment to enable live development in Go
  # pb:
  #   image: golang:1.22-alpine
  #   command: modd

networks:
  traefik_default:
    external: true

```

# docker-compose.yml

```yml
version: '3.5'

services:
  pb:
    image: alpine:latest
    entrypoint: /app/pb/entrypoint.sh
    command: "/app/pb/pocketbase serve --dev --http 0.0.0.0:8090 --publicDir ../sk/build"
    user: ${UID}:${GID}
    expose:
      - 8090
    working_dir: /app/pb
    environment:
      - HOME=/app/pb
      - AUDITLOG=${AUDITLOG}
    volumes:
      - ${PWD}/pb:/app/pb
      - ${PWD}/sk:/app/sk
      - ${HOME}/go/pkg:/go/pkg
  sk:
    image: oven/bun:latest
    user: ${UID}:${GID}
    # sveltekit build
    command: sh -c "bun install && bun run build"
    volumes:
      - ${PWD}/sk:/app/sk
      - ${PWD}/pb:/app/pb
    environment:
      - HOME=/app/sk
    working_dir: /app/sk

```

# Dockerfile

```
FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY pb/go.mod pb/go.sum pb/main.go ./
COPY pb/hooks ./hooks
COPY pb/auditlog ./auditlog
RUN apk --no-cache add upx make git gcc libtool musl-dev ca-certificates dumb-init \
  && go mod tidy \
  && CGO_ENABLED=0 go build \
  && upx pocketbase

FROM alpine
WORKDIR /app/pb
COPY --from=builder /build/pocketbase /app/pb/pocketbase
# COPY pb/pb_data ./pb_data #not needed
COPY pb/pb_hooks ./pb_hooks
COPY sk/build ./pb_public
COPY pb/pb_migrations ./pb_migrations
COPY pb/data ./data
# these are the volumes you could mount to your own dirs
VOLUME pb_data pb_public pb_migrations pb_hooks data
CMD ["/app/pb/pocketbase","serve", "--http", "0.0.0.0:8090"]
```

# LICENSE.md

```md
The MIT License (MIT)
Copyright (c) 2022 - present, Jitesh Doshi

Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

```

# pb/.gitignore

```
/.cache
/pocketbase
/*.zip
/pb_data
/tmp
```

# pb/auditlog/auditlog.go

```go
package auditlog

import (
	"encoding/json"
	"log"
	"os"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/daos"
	"github.com/pocketbase/pocketbase/models"
	"golang.org/x/exp/slices"
)

// collection names to be audit logged
var collections = strings.Split(os.Getenv("AUDITLOG"), ",")

func Register(app *pocketbase.PocketBase) {
	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		ensureSchema(app.Dao().DB())
		app.OnRecordAfterCreateRequest().Add(func(e *core.RecordCreateEvent) error {
			return doAudit(app, "insert", e.Record, e.HttpContext)
		})
		app.OnRecordAfterUpdateRequest().Add(func(e *core.RecordUpdateEvent) error {
			return doAudit(app, "update", e.Record, e.HttpContext)
		})
		app.OnRecordAfterDeleteRequest().Add(func(e *core.RecordDeleteEvent) error {
			return doAudit(app, "delete", e.Record, e.HttpContext)
		})
		return nil
	})
}

func diff(val1, val2 any) bool {
	// handle comparison of non-comparable types
	// TODO: add more cases to the switch below as we discover them
	switch v1 := val1.(type) {
	case []string:
		v2 := val2.([]string)
		if len(v1) != len(v2) {
			return true
		}
		for i, v1 := range v1 {
			if diff(v1, v2[i]) {
				return true
			}
		}
		// no diff, if reached the end of the loop
		return false
	default:
		// use builtin comparison by default
		return val1 != val2
	}
}

func doAudit(app *pocketbase.PocketBase, event string, record *models.Record, ctx echo.Context) error {
	collection := record.Collection().Name
	// exclude logging "auditlog" and include only what's in AUDITLOG env var
	if collection != "auditlog" && slices.Contains(collections, collection) {
		var user, admin string
		if u, ok := ctx.Get(apis.ContextAdminKey).(*models.Admin); ok {
			admin = u.Id
		}
		if u, ok := ctx.Get(apis.ContextAuthRecordKey).(*models.Record); ok {
			user = u.Id
		}
		log.Printf("AuditLog:%s:%s:%s:%s:%s\n", collection, record.Id, event, user, admin)
		target, err := app.Dao().FindCollectionByNameOrId("auditlog")
		if err != nil {
			return err
		}
		auditlog := models.NewRecord(target)
		auditlog.Set("collection", collection)
		auditlog.Set("record", record.Id)
		auditlog.Set("event", event)
		auditlog.Set("user", user)
		auditlog.Set("admin", admin)
		// detect changes
		original := record.OriginalCopy().PublicExport()
		recordExport := record.PublicExport()
		for k, v := range original {
			if !diff(v, recordExport[k]) { // unmodified, then remove
				delete(original, k)
			}
		}
		auditlog.Set("data", recordExport)
		auditlog.Set("original", original)

		return app.Dao().SaveRecord(auditlog)
	}
	return nil
}

func ensureSchema(db dbx.Builder) error {
	// add up queries...
	jsonData := `[
		{
      "id": "6buxxzelqzdugz3",
      "created": "2024-05-14 16:37:45.101Z",
      "updated": "2024-05-14 16:37:45.101Z",
      "name": "auditlog",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "ffcpmf8m",
          "name": "collection",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "0xqxkmxg",
          "name": "record",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "1xxszw4d",
          "name": "event",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "6k9tiq5x",
          "name": "user",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "_pb_users_auth_",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "fgxgjemm",
          "name": "admin",
          "type": "text",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "ij8bskyf",
          "name": "data",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 5242880
          }
        },
        {
          "system": false,
          "id": "v2h19a45",
          "name": "original",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 5242880
          }
        }
      ],
      "indexes": [],
      "listRule": "",
      "viewRule": "",
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    }
	]`

	collections := []*models.Collection{}
	if err := json.Unmarshal([]byte(jsonData), &collections); err != nil {
		return err
	}

	return daos.New(db).ImportCollections(collections, false, nil)
}

```

# pb/data/email_templates/post.html

```html
<p>The following post was updated. Please review it for changes:</p>

<a href="{{ .meta.AppUrl }}/posts/{{ .record.slug }}/">{{ .record.title }}</a>

```

# pb/entrypoint.sh

```sh
#!/bin/sh
set -e # exit on any non-zero status (error)

# this entrypoint script checks that all required setup is done.
# If not done, does it.
# And then proceeds to execute the main "command" for this container.
DIR=$(dirname $0)
cd $DIR
VERSION="0.22.12"
ARCH="linux_amd64"

# check for go and main.go, and use if present
if [ -x "$(which go)" ] && [ -f "$DIR/main.go" ]; then
  go mod tidy
  go build

  if [ ! -x "$(which modd)" ]; then
    echo "go install modd"
    go install github.com/cortesi/modd/cmd/modd@latest
  fi
else
  if [ ! -x "./pocketbase" ]; then
    DLURL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_${ARCH}.zip"
    wget -q ${DLURL} -O pb.zip && unzip -q -o pb.zip pocketbase
  fi
fi

exec "$@"
```

# pb/example-hook-script.sh

```sh
#!/usr/bin/env bash

# This example script, along with hooks.go, shows how to trigger a command
# when a record changes in PocketBase and how to feed the changed record to this
# script.

params=$1 # `action_params` field passed from the "hooks" table
echo "PARAMS=$params"

# The body of the record (as JSON) is fed to this script as stdin.
# The following just reformats it and pretty-prints it.
cat | jq -C
```

# pb/go.mod

```mod
module pocketbase

go 1.22

require (
	github.com/dop251/goja v0.0.0-20231027120936-b396bb4c349d
	github.com/labstack/echo/v5 v5.0.0-20230722203903-ec5b858dab61
	github.com/pocketbase/dbx v1.10.1
	github.com/pocketbase/pocketbase v0.22.12
	golang.org/x/exp v0.0.0-20231108232855-2478ac86f678
)

require (
	github.com/AlecAivazis/survey/v2 v2.3.7 // indirect
	github.com/asaskevich/govalidator v0.0.0-20230301143203-a9d515a09cc2 // indirect
	github.com/aws/aws-sdk-go-v2 v1.26.1 // indirect
	github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream v1.6.2 // indirect
	github.com/aws/aws-sdk-go-v2/config v1.27.13 // indirect
	github.com/aws/aws-sdk-go-v2/credentials v1.17.13 // indirect
	github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.16.1 // indirect
	github.com/aws/aws-sdk-go-v2/feature/s3/manager v1.16.17 // indirect
	github.com/aws/aws-sdk-go-v2/internal/configsources v1.3.5 // indirect
	github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.6.5 // indirect
	github.com/aws/aws-sdk-go-v2/internal/ini v1.8.0 // indirect
	github.com/aws/aws-sdk-go-v2/internal/v4a v1.3.5 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.11.2 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/checksum v1.3.7 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.11.7 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/s3shared v1.17.5 // indirect
	github.com/aws/aws-sdk-go-v2/service/s3 v1.53.2 // indirect
	github.com/aws/aws-sdk-go-v2/service/sso v1.20.6 // indirect
	github.com/aws/aws-sdk-go-v2/service/ssooidc v1.24.0 // indirect
	github.com/aws/aws-sdk-go-v2/service/sts v1.28.7 // indirect
	github.com/aws/smithy-go v1.20.2 // indirect
	github.com/disintegration/imaging v1.6.2 // indirect
	github.com/dlclark/regexp2 v1.10.0 // indirect
	github.com/domodwyer/mailyak/v3 v3.6.2 // indirect
	github.com/dop251/goja_nodejs v0.0.0-20231122114759-e84d9a924c5c // indirect
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/fatih/color v1.16.0 // indirect
	github.com/fsnotify/fsnotify v1.7.0 // indirect
	github.com/gabriel-vasile/mimetype v1.4.3 // indirect
	github.com/ganigeorgiev/fexpr v0.4.0 // indirect
	github.com/go-ozzo/ozzo-validation/v4 v4.3.0 // indirect
	github.com/go-sourcemap/sourcemap v2.1.3+incompatible // indirect
	github.com/goccy/go-json v0.10.2 // indirect
	github.com/golang-jwt/jwt/v4 v4.5.0 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/google/pprof v0.0.0-20240409012703-83162a5b38cd // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/googleapis/gax-go/v2 v2.12.4 // indirect
	github.com/hashicorp/golang-lru/v2 v2.0.7 // indirect
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/jmespath/go-jmespath v0.4.0 // indirect
	github.com/kballard/go-shellquote v0.0.0-20180428030007-95032a82bc51 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/mattn/go-sqlite3 v1.14.22 // indirect
	github.com/mgutz/ansi v0.0.0-20200706080929-d51e80ef957d // indirect
	github.com/ncruces/go-strftime v0.1.9 // indirect
	github.com/remyoudompheng/bigfft v0.0.0-20230129092748-24d4a6f8daec // indirect
	github.com/spf13/cast v1.6.0 // indirect
	github.com/spf13/cobra v1.8.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	github.com/valyala/bytebufferpool v1.0.0 // indirect
	github.com/valyala/fasttemplate v1.2.2 // indirect
	go.opencensus.io v0.24.0 // indirect
	gocloud.dev v0.37.0 // indirect
	golang.org/x/crypto v0.23.0 // indirect
	golang.org/x/image v0.16.0 // indirect
	golang.org/x/net v0.25.0 // indirect
	golang.org/x/oauth2 v0.20.0 // indirect
	golang.org/x/sync v0.7.0 // indirect
	golang.org/x/sys v0.20.0 // indirect
	golang.org/x/term v0.20.0 // indirect
	golang.org/x/text v0.15.0 // indirect
	golang.org/x/time v0.5.0 // indirect
	golang.org/x/xerrors v0.0.0-20231012003039-104605ab7028 // indirect
	google.golang.org/api v0.180.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240509183442-62759503f434 // indirect
	google.golang.org/grpc v1.63.2 // indirect
	google.golang.org/protobuf v1.34.1 // indirect
	modernc.org/gc/v3 v3.0.0-20240304020402-f0dba7c97c2b // indirect
	modernc.org/libc v1.50.5 // indirect
	modernc.org/mathutil v1.6.0 // indirect
	modernc.org/memory v1.8.0 // indirect
	modernc.org/sqlite v1.29.9 // indirect
	modernc.org/strutil v1.2.0 // indirect
	modernc.org/token v1.1.0 // indirect
)

```

# pb/hooks/email.go

```go
package hooks

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/mail"

	"html/template"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/tools/mailer"
)

var tpls *template.Template

func init() {
	tpls = template.Must(template.ParseGlob("data/email_templates/*"))
}

// set IgnoreEmailVisibilityFlag for the record and it's expanded records (recursively)
func ignoreEmailVisibility(record *models.Record, value bool) {
	record.IgnoreEmailVisibility(value)
	for _, v := range record.Expand() {
		if child, ok := v.(*models.Record); ok {
			// recursively set ...
			ignoreEmailVisibility(child, value)
		}
	}
}

func doEmail(app *pocketbase.PocketBase, action, action_params string, record *models.Record) (err error) {
	// we have to IgnoreEmailVisibility(true) on the main record and all expanded relations in order
	// to include email fields in the exported JSON
	ignoreEmailVisibility(record, true)

	// Export record to JSON and import it back to convert it into map[string]any.
	// Should I use record.PublicExport() instead?
	ba, _ := json.Marshal(record)
	// log.Default().Println(string(ba))
	var _record map[string]any
	json.Unmarshal(ba, &_record)

	// build input data
	data := map[string]any{
		"record": _record,
		"meta":   app.Settings().Meta,
	}

	// populate template expressions within action_params to build params_json
	// example: {"to":"{{ .record.expand.creator.email }}", "subject": "ticket updated - {{ .record.title }}"}
	params_tpl, err := template.New("action_params").Parse(action_params)
	if err != nil {
		return
	}
	var params_json bytes.Buffer
	err = params_tpl.Execute(&params_json, data)
	if err != nil {
		return
	}

	// Unmarshal params_json into params and then inject that into data
	var params map[string]any
	err = json.Unmarshal(params_json.Bytes(), &params)
	if err != nil {
		return
	}
	data["params"] = params

	if _, ok := params["from"]; !ok {
		params["from"] = app.Settings().Meta.SenderName
	}
	if _, ok := params["to"]; !ok {
		return errors.New("action_params must provide 'to' key/value")
	}
	if _, ok := params["subject"]; !ok {
		return errors.New("action_params must provide 'subject' key/value")
	}

	var html bytes.Buffer
	err = tpls.ExecuteTemplate(&html, action, data)
	if err != nil {
		return
	}
	message := mailer.Message{
		From: mail.Address{
			Address: app.Settings().Meta.SenderAddress,
			Name:    params["from"].(string),
		},
		To: []mail.Address{
			{Address: params["to"].(string)},
		},
		Subject: params["subject"].(string),
		HTML:    html.String(),
		// Text:    string(ba),
	}
	return app.NewMailClient().Send(&message)
}

```

# pb/hooks/hooks.go

```go
package hooks

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/daos"
	"github.com/pocketbase/pocketbase/models"
)

func Register(app *pocketbase.PocketBase) {
	modelHandler := func(event string) func(e *core.ModelEvent) error {
		return func(e *core.ModelEvent) error {
			table := e.Model.TableName()
			// we don't want to executeEventActions if the event is a system event (e.g. "_collections" changes)
			if record, ok := e.Model.(*models.Record); ok {
				if table == "hooks" {
					log.Println("'hooks' collection changed. Unloading.")
					hookRowsMap = nil // just set it to nil and it will get re-loaded the next time it is needed
				} else {
					executeEventActions(app, event, table, record)
				}
			} else {
				log.Println("Skipping executeEventActions for table:", table)
			}
			return nil
		}
	}
	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		ensureSchema(app.Dao().DB())
		// watch insert/update/delete of rows of all collections
		app.OnModelAfterCreate().Add(modelHandler("insert"))
		app.OnModelAfterUpdate().Add(modelHandler("update"))
		app.OnModelAfterDelete().Add(modelHandler("delete"))
		return nil
	})
}

// cache of "hooks" table rows (all where disabled=false)
// key=collection:event, value=array-of-rows
var hookRowsMap map[string][]dbx.NullStringMap

func loadHookRows(db *dbx.DB) {
	if hookRowsMap != nil {
		return // already loaded (cached)
	}
	hookRowsMap = make(map[string][]dbx.NullStringMap)
	var rows []dbx.NullStringMap
	db.Select("*").
		From("hooks").
		Where(dbx.HashExp{"disabled": false}). // exclude "disabled" rows
		All(&rows)
	for _, row := range rows {
		collection := row["collection"].String
		event := row["event"].String
		key := collection + ":" + event
		hookRowsMap[key] = append(hookRowsMap[key], row)
	}
}

func getHookRows(db *dbx.DB, collection, event string) []dbx.NullStringMap {
	loadHookRows(db)
	key := collection + ":" + event
	return hookRowsMap[key]
}

func executeEventActions(app *pocketbase.PocketBase, event string, table string, record *models.Record) {
	rows := getHookRows(app.DB(), table, event)
	for _, row := range rows {
		action_type := row["action_type"].String
		action := row["action"].String
		action_params := row["action_params"].String
		expands := strings.Split(row["expands"].String, ",")
		app.Dao().ExpandRecord(record, expands, func(c *models.Collection, ids []string) ([]*models.Record, error) {
			return app.Dao().FindRecordsByIds(c.Name, ids, nil)
		})
		if err := executeEventAction(app, event, table, action_type, action, action_params, record); err != nil {
			log.Println("ERROR", err)
		}
	}
}

func executeEventAction(app *pocketbase.PocketBase, event, table, action_type, action, action_params string, record *models.Record) error {
	log.Printf("event:%s, table: %s, action: %s\n", event, table, action)
	switch action_type {
	case "command":
		return doCommand(action, action_params, record)
	case "post":
		return doPost(action, action_params, record)
	case "email":
		return doEmail(app, action, action_params, record)
	default:
		return errors.New(fmt.Sprintf("Unknown action_type: %s", action_type))
	}
}

func doCommand(action, action_params string, record *models.Record) error {
	cmd := exec.Command(action, action_params)
	if w, err := cmd.StdinPipe(); err != nil {
		return err
	} else {
		if r, err := cmd.StdoutPipe(); err != nil {
			return err
		} else {
			go func() {
				defer w.Close()
				defer r.Close()
				log.Println("-------------------------------")
				defer log.Println("-------------------------------")
				if err := cmd.Start(); err != nil {
					log.Printf("command start failed: %s %+v\n", action, err)
				} else {
					// write JSON into the pipe and close
					json.NewEncoder(w).Encode(record)
					w.Close()
					if err := cmd.Wait(); err != nil {
						log.Printf("command wait failed: %s %+v\n", action, err)
					}
				}
			}()
			// read pipe's stdout and copy to ours (in parallel to the above goroutine)
			io.Copy(os.Stdout, r)
		}
	}
	return nil
}

func doPost(action, action_params string, record *models.Record) error {
	r, w := io.Pipe()
	defer w.Close()
	go func() {
		defer r.Close()
		if resp, err := http.Post(action, "application/json", r); err != nil {
			log.Println("POST failed", action, err)
		} else {
			io.Copy(os.Stdout, resp.Body)
		}
	}()
	if err := json.NewEncoder(w).Encode(record); err != nil {
		log.Println("ERROR writing to pipe", err)
	}
	return nil
}

func ensureSchema(db dbx.Builder) error {
	// add up queries...
	jsonData := `[
			{
				"id": "3fhw2mfr9zrgodj",
				"created": "2022-12-23 22:30:35.443Z",
				"updated": "2024-05-27 18:57:06.058Z",
				"name": "hooks",
				"type": "base",
				"system": false,
				"schema": [
					{
						"system": false,
						"id": "j8mewfur",
						"name": "collection",
						"type": "text",
						"required": true,
						"presentable": false,
						"unique": false,
						"options": {
							"min": null,
							"max": null,
							"pattern": ""
						}
					},
					{
						"system": false,
						"id": "4xcxcfuv",
						"name": "event",
						"type": "select",
						"required": true,
						"presentable": false,
						"unique": false,
						"options": {
							"maxSelect": 1,
							"values": [
								"insert",
								"update",
								"delete"
							]
						}
					},
					{
						"system": false,
						"id": "u3bmgjpb",
						"name": "action_type",
						"type": "select",
						"required": true,
						"presentable": false,
						"unique": false,
						"options": {
							"maxSelect": 1,
							"values": [
								"command",
								"email",
								"post"
							]
						}
					},
					{
						"system": false,
						"id": "kayyu1l3",
						"name": "action",
						"type": "text",
						"required": true,
						"presentable": false,
						"unique": false,
						"options": {
							"min": null,
							"max": null,
							"pattern": ""
						}
					},
					{
						"system": false,
						"id": "zkengev8",
						"name": "action_params",
						"type": "text",
						"required": false,
						"presentable": false,
						"unique": false,
						"options": {
							"min": null,
							"max": null,
							"pattern": ""
						}
					},
					{
						"system": false,
						"id": "balsaeka",
						"name": "expands",
						"type": "text",
						"required": false,
						"presentable": false,
						"unique": false,
						"options": {
							"min": null,
							"max": null,
							"pattern": ""
						}
					},
					{
						"system": false,
						"id": "emgxgcok",
						"name": "disabled",
						"type": "bool",
						"required": false,
						"presentable": false,
						"unique": false,
						"options": {}
					}
				],
				"indexes": [],
				"listRule": null,
				"viewRule": null,
				"createRule": null,
				"updateRule": null,
				"deleteRule": null,
				"options": {}
			}
	]`

	collections := []*models.Collection{}
	if err := json.Unmarshal([]byte(jsonData), &collections); err != nil {
		return err
	}

	return daos.New(db).ImportCollections(collections, false, nil)
}

```

# pb/main.go

```go
package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/dop251/goja"
	"github.com/labstack/echo/v5"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func defaultPublicDir() string {
	if strings.HasPrefix(os.Args[0], os.TempDir()) {
		// most likely ran with go run
		return "./pb_public"
	}

	return filepath.Join(os.Args[0], "../pb_public")
}

func main() {
	app := pocketbase.New()

	var hooksDir string
	app.RootCmd.PersistentFlags().StringVar(
		&hooksDir,
		"hooksDir",
		"",
		"the directory with the JS app hooks",
	)

	var hooksWatch bool
	app.RootCmd.PersistentFlags().BoolVar(
		&hooksWatch,
		"hooksWatch",
		true,
		"auto restart the app on pb_hooks file change",
	)

	var hooksPool int
	app.RootCmd.PersistentFlags().IntVar(
		&hooksPool,
		"hooksPool",
		25,
		"the total prewarm goja.Runtime instances for the JS app hooks execution",
	)

	var migrationsDir string
	app.RootCmd.PersistentFlags().StringVar(
		&migrationsDir,
		"migrationsDir",
		"pb_migrations",
		"the directory with the user defined migrations",
	)

	var automigrate bool
	app.RootCmd.PersistentFlags().BoolVar(
		&automigrate,
		"automigrate",
		true,
		"enable/disable auto migrations",
	)

	var publicDir string
	app.RootCmd.PersistentFlags().StringVar(
		&publicDir,
		"publicDir",
		defaultPublicDir(),
		"the directory to serve static files",
	)

	var indexFallback bool
	app.RootCmd.PersistentFlags().BoolVar(
		&indexFallback,
		"indexFallback",
		true,
		"fallback the request to index.html on missing static path (eg. when pretty urls are used with SPA)",
	)

	var queryTimeout int
	app.RootCmd.PersistentFlags().IntVar(
		&queryTimeout,
		"queryTimeout",
		30,
		"the default SELECT queries timeout in seconds",
	)

	app.RootCmd.ParseFlags(os.Args[1:])

	// load js files to allow loading external JavaScript migrations
	jsvm.MustRegister(app, jsvm.Config{
		MigrationsDir: migrationsDir,
		HooksWatch:    true, // make this false for production
		OnInit: func(vm *goja.Runtime) {
			vm.Set("foo", "this var was injected into JSVM by Go")
		},
	})

	// register the `migrate` command
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS, // or migratecmd.TemplateLangGo (default)
		Automigrate:  true,
	})

	/*
	 * Use this only if you want to do audit logging of tables named in AUDITLOG
	 * env var (e.g. AUDITLOG=users,posts) impelemented in Go.
	 * Keep in mind that there is already a JSVM implementation of this feature in ./pb_hooks dir.
	 */
	// auditlog.Register(app)

	/*
	 * Use this only if you want to use the "hooks" implemented in Go.
	 * It's probably better to use hooks in JSVM though. See "auditlog" example
	 * in ./pb_hooks.
	 */
	// hooks.Register(app)

	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		e.Router.GET("/*", apis.StaticDirectoryHandler(os.DirFS(publicDir), indexFallback))

		// custom endpoint
		e.Router.AddRoute(echo.Route{
			Method: http.MethodGet,
			Path:   "/api/go-hello",
			Handler: func(c echo.Context) error {
				obj := map[string]interface{}{"message": "Hello world from Go!"}
				return c.JSON(http.StatusOK, obj)
			},
			// Middlewares: []echo.MiddlewareFunc{
			// 	apis.RequireAdminOrUserAuth(),
			// },
		})

		return nil
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

```

# pb/modd.conf

```conf
# Run go test on ALL modules on startup, and subsequently only on modules
# containing changes.
**/*.go {
    prep: go build
    # prep: go test @dirmods
    daemon +sigterm: ./pocketbase serve --dev --http 0.0.0.0:8090 --publicDir ../sk/build
}

```

# pb/pb_hooks/auditlog.js

```js
/// <reference path="../pb_data/types.d.ts" />

const collections = $os.getenv("AUDITLOG")?.split(",") ?? [];

/**
 * Inserts an auditlog record for the given event (insert/update/delete)
 * that happens on the given record.
 *
 * @param {string} event
 * @param {models.Record} record
 * @param {echo.Context} c
 */
function doAudit(event, record, c) {
  // list of collections that are to be audit-logged
  const collection = record.collection().name;
  // exclude logging "auditlog" and include only what's in AUDITLOG env var
  if (collection != "auditlog" && collections.includes(collection)) {
    /** @type {models.Admin} */
    const admin = c.get("admin");
    /** @type {models.Record} */
    const user = c.get("authRecord");
    console.log("AuditLog", collection, record.id, event, user, admin);
    const auditlog = new Record(
      $app.dao().findCollectionByNameOrId("auditlog")
    );
    auditlog.set("collection", collection);
    auditlog.set("record", record.id);
    auditlog.set("event", event);
    auditlog.set("user", user?.id);
    auditlog.set("admin", admin?.id);
    // detect changes
    const original = record.originalCopy().publicExport();
    const recordExport = record.publicExport();
    for (const [k, v] of Object.entries(original)) {
      if (v == recordExport[k]) {
        // unchanged, then remove from "original"
        delete original[k];
      }
    }
    auditlog.set("data", recordExport);
    auditlog.set("original", original);
    $app.dao().save(auditlog);
  }
}

module.exports = {
  doAudit,
};

```

# pb/pb_hooks/config.json

```json
{
  "site": {
    "name": "this comes from pocketbase admin settings",
    "copyright": "Same as above",
    "year": 2024
  },
  "signupAllowed": true
}

```

# pb/pb_hooks/main.pb.js

```js
// Extending PocketBase with JS - @see https://pocketbase.io/docs/js-overview/

/// <reference path="../pb_data/types.d.ts" />

/**
 * Demo route implemented in JS. Says hello to the user's name or email.
 */
routerAdd(
  "GET",
  "/api/hello",
  (c) => {
    /** @type {models.Admin} */
    const admin = c.get("admin");
    /** @type {models.Record} */
    const record = c.get("authRecord");
    return c.json(200, {
      message: "Hello " + (record?.getString("name") ?? admin?.email),
      // the next var was injected by Go
      foo,
    });
  },
  // middleware(s)
  $apis.requireAdminOrRecordAuth()
);

/**
 * Sends email to the logged in user.
 */
routerAdd(
  "POST",
  "/api/sendmail",
  (c) => {
    /** @type {models.Admin} */
    const admin = c.get("admin");
    /** @type {models.Record} */
    const record = c.get("authRecord");
    record?.ignoreEmailVisibility(true); // required for user.get("email")
    const to =
      record?.get("email") ?? // works only after user.ignoreEmailVisibility(true)
      admin?.email;
    const name = $app.settings().meta.senderName;
    const address = $app.settings().meta.senderAddress;
    const message = new MailerMessage({
      from: {
        address,
        name,
      },
      to: [{ address: to }],
      subject: `test email from ${name}`,
      text: "Test email",
      html: "<strong>Test</strong> <em>email</em>",
    });
    $app.newMailClient().send(message);

    return c.json(200, { message });
  },
  // middleware(s)
  $apis.requireAdminOrRecordAuth()
);

// public config
routerAdd(
  "GET",
  "/api/config",
  (c) => {
    const { parseJSONFile } = require(`${__hooks}/util`);
    const config = parseJSONFile(`${__hooks}/config.json`);
    const settings = $app.settings();
    config.site.name = settings.meta.appName;
    config.site.copyright = settings.meta.appName;
    c.json(200, config);
  } /* no auth */
);

// auditlog generation
onRecordAfterCreateRequest((e) => {
  const { doAudit } = require(`${__hooks}/auditlog`);
  return doAudit("insert", e.record, e.httpContext);
});
onRecordAfterUpdateRequest((e) => {
  const { doAudit } = require(`${__hooks}/auditlog`);
  return doAudit("update", e.record, e.httpContext);
});
onRecordAfterDeleteRequest((e) => {
  const { doAudit } = require(`${__hooks}/auditlog`);
  doAudit("delete", e.record, e.httpContext);
});

onModelBeforeCreate((e) => {
  const { slugDefault } = require(`${__hooks}/util`);
  slugDefault(e.model);
}, "posts");

onModelBeforeUpdate((e) => {
  const { slugDefault } = require(`${__hooks}/util`);
  slugDefault(e.model);
}, "posts");

routerAdd(
  "POST",
  "/api/generate",
  (c) => {
    const url = "https://loripsum.net/api/3/short/medium/plaintext";
    const response = $http.send({ url });
    const body = response.raw;
    // last sentence becomes the title
    const [_, title] = body.match(/([a-zA-Z][ a-zA-Z]*[a-zAZ])[^a-zA-Z]*$/);
    const slug = title.toLowerCase().replace(" ", "-");
    const coll = $app.dao().findCollectionByNameOrId("posts");
    /** @type {models.Record} */
    const user = c.get("authRecord");
    const record = new Record(coll, { title, body, slug, user: user?.id });
    const form = new RecordUpsertForm($app, record);
    form.addFiles(
      "files",
      $filesystem.fileFromUrl("https://picsum.photos/500/300"),
      $filesystem.fileFromUrl("https://picsum.photos/500/300")
    );
    form.submit();
    // $app.dao().saveRecord(record);
    c.json(200, record);
  },
  $apis.requireAdminOrRecordAuth()
);

```

# pb/pb_hooks/util.js

```js
/// <reference path="../pb_data/types.d.ts" />

// parses JSON values retrieved from pocketbase as byte-arrays
function parseJSON(bytes) {
  const str = bytes.map((c) => String.fromCharCode(c)).join("");
  return JSON.parse(str);
}

/**
 * @param {string} path
 */
function parseJSONFile(path) {
  return parseJSON($os.readFile(path));
}

// if obj.slug is empty, make it same as obj.id
function slugDefault(obj) {
  if (obj) {
    const slug = obj.get("slug");
    if (!slug) {
      obj.set("slug", obj.id);
    }
  }
}

module.exports = {
  parseJSON,
  parseJSONFile,
  slugDefault,
};

```

# pb/pb_migrations/1716411453_collections_snapshot.js

```js
/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const snapshot = [
    {
      "id": "6buxxzelqzdugz3",
      "created": "2024-05-14 16:37:45.101Z",
      "updated": "2024-05-14 16:37:45.101Z",
      "name": "auditlog",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "ffcpmf8m",
          "name": "collection",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "0xqxkmxg",
          "name": "record",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "1xxszw4d",
          "name": "event",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "6k9tiq5x",
          "name": "user",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "_pb_users_auth_",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "fgxgjemm",
          "name": "admin",
          "type": "text",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "ij8bskyf",
          "name": "data",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 5242880
          }
        },
        {
          "system": false,
          "id": "v2h19a45",
          "name": "original",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 5242880
          }
        }
      ],
      "indexes": [],
      "listRule": "",
      "viewRule": "",
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
    {
      "id": "5bba43cis9ctxr2",
      "created": "2024-05-14 18:39:07.726Z",
      "updated": "2024-05-14 18:39:07.726Z",
      "name": "posts",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "p4ahsysc",
          "name": "title",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "udhmrtrn",
          "name": "body",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "itmmirru",
          "name": "slug",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": true,
          "options": {
            "min": null,
            "max": null,
            "pattern": "[0-9a-z-]+"
          }
        },
        {
          "system": false,
          "id": "h6hquidm",
          "name": "files",
          "type": "file",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "mimeTypes": [],
            "thumbs": [
              "600x0"
            ],
            "maxSelect": 99,
            "maxSize": 5242880,
            "protected": false
          }
        },
        {
          "system": false,
          "id": "sa3zktz1",
          "name": "user",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "_pb_users_auth_",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX \"idx_unique_itmmirru\" on \"posts\" (\"slug\")"
      ],
      "listRule": "",
      "viewRule": "",
      "createRule": "@request.auth.id != null",
      "updateRule": "user = @request.auth.id",
      "deleteRule": "user = @request.auth.id",
      "options": {}
    },
    {
      "id": "_pb_users_auth_",
      "created": "2024-05-22 18:42:22.090Z",
      "updated": "2024-05-22 18:42:22.093Z",
      "name": "users",
      "type": "auth",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "users_name",
          "name": "name",
          "type": "text",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "users_avatar",
          "name": "avatar",
          "type": "file",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "mimeTypes": [
              "image/jpeg",
              "image/png",
              "image/svg+xml",
              "image/gif",
              "image/webp"
            ],
            "thumbs": null,
            "maxSelect": 1,
            "maxSize": 5242880,
            "protected": false
          }
        }
      ],
      "indexes": [],
      "listRule": "id = @request.auth.id",
      "viewRule": "id = @request.auth.id",
      "createRule": "",
      "updateRule": "id = @request.auth.id",
      "deleteRule": "id = @request.auth.id",
      "options": {
        "allowEmailAuth": true,
        "allowOAuth2Auth": true,
        "allowUsernameAuth": true,
        "exceptEmailDomains": null,
        "manageRule": null,
        "minPasswordLength": 8,
        "onlyEmailDomains": null,
        "onlyVerified": false,
        "requireEmail": false
      }
    }
  ];

  const collections = snapshot.map((item) => new Collection(item));

  return Dao(db).importCollections(collections, true, null);
}, (db) => {
  return null;
})

```

# pb/pocketbase

This is a binary file of the type: Binary

# pb/README.md

```md
# Backend with PocketBase

There are two flavors of the backend:

1. Standard release downloaded from https://github.com/pocketbase/pocketbase/releases. It even allows [extending with JavaScript](https://pocketbase.io/docs/js-overview/). This one is a good start, but if you want full control see next.
2. Custom compiled (`go build`), possibly with my customizations and perhaps yours too.

`entrypoint.sh` defaults to option 2 if `go` compiler is found. If not, then is just downloads
`pocketbase` (option 1). Also, you can control it by looking at the `image` and `command` settings
in `docker-compose.yml` and `docker-compose.override.yml`.

## standard (official) release of pocketbase

Download from release archive from https://github.com/pocketbase/pocketbase/releases/latest, unzip it and place the `pocketbase` binary in this folder, and you're done.

## custom build

If you would like to extend PocketBase and use it as a framework then there is a `main.go`
in this folder that you can customize and build using `go build` or do live development
using `modd`.

See https://pocketbase.io/docs/use-as-framework/ for details.

# Setup

## Architecture

> **Note:** For optimal setup, ensure you are using Linux (bare-metal, VM, WSL) or Docker. For other operating systems, you may run into issues, or need additional configuration.
> A docker-compose setup is included with the project, which can be used on any OS.

### TBD: For Windows users

_please contribute if you are a Windows user_

### TBD: For MacOS users

_please contribute if you are a MacOS user_

## Build

Assuming you have Go language tools installed ...

`go build`

If you don't have Go and don't want to install it, you can use docker-compose setup. Otherwise, your only choice is to download the binary from https://github.com/pocketbase/pocketbase/releases/latest, and placing it in this folder. But then you are limited to using JavaScript or configuration (but not Go-language customizations).

## Run migrations

Before you can run the actual backend, you must run the migrations using `./pocketbase migrate up` in the current directory. It will create appropriate schema tables/collections.

## Run the backend

You can run the PocketBase backend direct with `./pocketbase serve` or using `npm run backend` in the `sk` directory. Note that `npm run backend` it is included by default, but if you want the backend to also serve the frontend assets, then you must add the `--publicDir ../frontend/build` option. (Read more about this in [sk/package.json](../sk/package.json).)

## Docker

A highly recommended option is to run it inside a Docker container. A `Dockerfile` is included that builds a production Docker image. Also, a `docker-compose.yml` along with an _override_ file example are included, which should be used during development.

## Active development with `modd`

Finally, if you are going to actively develop using Go using PocketBase as a framework, then you probably want to use [modd](https://github.com/cortesi/modd), a development tool that rebuilds and restarts your Go binary everytime a source file changes (live reload on change). An basic `modd.conf` config file is included in this setup. You can run it by installing `modd` (`go install github.com/cortesi/modd/cmd/modd@latest`) and then running `modd`. All this is done automatically for you if you are using Docker.

# Schema (Collections)

With the 0.9 version of PocketBase, JavaScript auto-migrations as implemented. The JS files in `pb_migrations` can create/drop/modify collections and data. These are executed automatically by PocketBase on startup.

Not only that, they are also generated automatically whenever you change the schema! So go ahead and make changes to the schema and watch new JS files generated in the `pb_migrations` folder. Just remember to commit them to version control.

## Generated Types

The file `generated-types.ts` contains TypeScript definitions of `Record` types mirroring the fields in your database collections. But it needs to be regenerated every time you modify the schema. This can be done by simply running the `typegen` script in the frontend's `package.json`. So remember to do that.

# Hooks

_**NOTE**: "hooks" funtionality has been commented out in `main.go` because (my) recommended way to implement hooks is using JSVM. Same principle, but instead of being driven by config in a table, you can implement `onRecord*` callbacks in `pb_hooks/*.pb.js` files._

PocketBase provides API's like .OnModelBefore* and .OnModelAfter* to run
callbacks when records change. This app builds on top of that by providing
a "hooks" table that drives those hooks using configuration. It has the
following fields:

- collection: name of the collection that triggers an action
- event: insert/update/delete event that triggers the action
- action_type: "command" if you want to run a program/script or "post" if
  you want to POST to a webhook endpoint. The record will be marshaled to
  JSON and passed to the command as STDIN or to the webhook POST as
  request body (with header 'content-type: application/json')
- action: path to the command/script or URL of the webhook to POST to
- action_params: a string that will be passed as argument to the action

So now by configuring the above table, you can execute external commands/scripts
and POST data to external webhooks in reaction to insert/update/delete of
records.

Most web services these days provide webhook endpoints (e.g. sendgrid, mailchimp, stripe, etc) which you can POST directly to. But if you need special
processing then you can write a script that receives changed data as JSON, parses and manipulates it using [`jq`](https://github.com/stedolan/jq) before
sending it on its way.

See `example-hook-script.sh` for a demonstration.

Possible use cases:

- Send an acknowledgement email when a "contact" form table is inserted to.
- Charge a credit card when payment_token table is inserted to and then
  send email upon success/failure
- Recalculate inventory levels as "orders" table is inserted to, and then
  send notifications when inventory becomes low.

```

# README.md

```md
# PocketBase / SvelteKit Starter App

Use this app as a starting point for your own _customized_
[PocketBase](https://github.com/pocketbase/pocketbase) backend
with [SvelteKit](https://kit.svelte.dev) frontend.
This is a high-performance frontend+backend combination, since frontend
is static and backend is a single compiled Golang binary (JAMstack baby!).

- SvelteKit frontend is fully static, client-side only, so that here is no need
  for NodeJS at runtime. It is generated using
  [`adapter-static`](https://github.com/sveltejs/kit/tree/master/packages/adapter-static)
  and `ssr` is OFF.
- PocketBase provides complete (and _fast_) backend including:
  - databse (SQLite)
  - CRUD API for database
  - realtime subscriptions for LIVE data (server push to browser)
  - Authentication and Authorization (email + social login/oauth2)
  - file storage (local filesystem or S3)
  - Extend with hooks and API endpoints in ...
    - [JavaScript](https://pocketbase.io/docs/js-overview/) for easy development.
      See the example [main.pb.ts](./pb/pb_hooks/main.pb.ts).
    - OR [Golang](https://pocketbase.io/docs/go-overview/) for full performance
      See `main.go`
- PocketBase can be downloaded as binary, and yet be extended with JavaScript.
  But if you want to extend it with custom Golang code then code is included
  to compile it locally with extensions such as custom endpoints (e.g. `/api/hello`)
  and database event hooks (e.g. executing Go handler functions when a database row is created)
- A full live development setup is included
  - Hot Module Reloading (HMR) of your frontend app when you edit Svelte code (including proxying requests to the PocketBase backend via `vite`)
  - Hot reloading (restarting) of the PocketBase server using `modd` when you edit Go code
  - Hot reloading (restarting) of the PocketBase server when JS code is changed in `./pb/pb_hooks`

To understand the backend, see [./pb/README.md](./pb/README.md) ("pb" == PocketBase)
To understand the frontend, see [./sk/README.md](./sk/README.md) ("sk" == SvelteKit)

Read those README files before proceeding.

# Setup

Follow these steps CAREFULLY, or else it won't work. Also read the README files referred above before proceeding.

## With Docker

This method is the most recommended method for setting up this application in most use cases, especially when customizing with Go code.

Make sure your Docker daemon is running then complete the following steps:

1. Copy`.env.example` to `.env` and then edit it to match your environment.
   Also, if you wish, copy `docker-compose.override.yml` to `docker-compose.override.yml`
   and edit it to your taste before proceeding.
   And then just run `docker compose up -d`.
2. Open a new terminal and navigate to the `/sk` directory. Install dependencies by
   running `bun install`
3. In the same terminal, after the dependencies are installed, run the command `bun run dev:backend`
   This runs `go build` in the `/pb` directory and runs `modd` for live development on a
   backend server
4. Open a seperate terminal, navigate to the `/sk` directory, and run the command `bun run dev`.
   This starts the frontend dev server.
5. Both sides are working if you navigate to the "Hello" page on the development server
   and there is an API response that says "Hello World!"

## With pocketbase binary

This method is a good alternative for simple use cases that don't use either Docker or Go, and instead uses JavaScript-exclusive customizations.

1. [Download the latest version of PocketBase.](https://github.com/pocketbase/pocketbase/releases/latest)
   - The versions support Darwin, Linux, and Windows. Make sure that you download the correct version that supports itself within the OS that you are using.
2. Extract the `pocketbase.exe` from the `.zip` file you downloaded into the `/pb` folder within your project.
3. Set up the backend
   - Open a new terminal, navigate to the `/sk` directory and run the command `bun run backend`
     - _For Windows:_ You will have to edit the `"backend"` script in the `./sk/package.json` file to `cd .. && cd pb && pocketbase serve --publicDir=../sk/build`
     - _For Mac:_ _Please contribute_
4. Set up the frontend
   - Open a new terminal, navigate to the `/sk` directory and run the following
     - First install dependencies using `bun install`
     - Then, `bun run dev`
5. Extend JavaScript by [checking out this documentation here.](https://pocketbase.io/docs/js-overview/).

## With Go Tools

This method works if you have Go Tools installed and want to set up the machine directly on your specific OS and you don't want to use Docker.

1. Verify that the Go compiler is installed on your machine by opening a terminal and running `go version`. If there is an error, set up the go compiler in acccordance with the type of OS you are using.
2. Make sure you `go.mod` file is ready to be built by navigating to the `/pb` directory and running `go mod tidy` in the terminal, especially if the file is throwing errors.
3. In the same terminal, run `go build`. This may take a moment
   - If you want to use `modd` for live devlopment, after building, install the latest version by running `go install github.com/cortesi/modd/cmd/modd@latest`, test the installation by running `modd`. If successful, data migration should occur and a backend development server should be running. You can learn more by reading about it in the README located in the `/pb` directory.
4. Open a new terminal, and run `cd sk && npm run develop`. When you open the localhost page in your browser, the “Hello” page should have an “Hello World” message coming from the API response

# Developing

Visit http://localhost:5173 (sk) or http://localhost:8090 (pb)

If you are running `modd`, making changes in the Svelte code (frontend) or Go code (backend) will show
results (almost) immediately.

# Usage

To use the app as a user / tester ...

- visit the frontend URL (e.g. http://localhost:5173)
- Navigate around. The Home page is not very interesting.
- The `hello` page shows and example of frontend calling a custom backend API implemented in Go.
- The `posts` page shows all existing posts. If that page is empty, then you might want to create some posts. You must be logged in to be able to create posts.
- Into the `Login` form, you can enter an existing username/password, or check the `register` checkbox to create a new account (it registers the user and log in immediately).

The above are just some sample features. Now go ahead and implement all kinds of new features.

- Create new collections.
- Create new pages that manipulate the above collections.

# Building

See the build process details in the README files for backend and frontend.

# Configurable Hooks

Please read about the "hooks" system in [./pb/README.md](./pb/README.md)
It is a very easy and powerful way to extend your application with minimal
configuration and perhaps no code.

# Feedback

Please provide feedback by
[opening an issue](https://github.com/spinspire/pocketbase-sveltekit-starter/issues/new)
or
[starting a discussion](https://github.com/spinspire/pocketbase-sveltekit-starter/discussions).

```

# sk/.gitignore

```
.DS_Store
node_modules
/build
/.svelte-kit
/package
.env
.env.*
!.env.example
vite.config.js.timestamp-*
vite.config.ts.timestamp-*

```

# sk/.npmrc

```
engine-strict=true

```

# sk/.prettierignore

```
# Ignore files for PNPM, NPM and YARN
pnpm-lock.yaml
package-lock.json
yarn.lock

```

# sk/.prettierrc

```
{
  "useTabs": false,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 80,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [
    {
      "files": "*.svelte",
      "options": {
        "parser": "svelte"
      }
    }
  ]
}

```

# sk/components.json

```json
{
	"$schema": "https://next.shadcn-svelte.com/schema.json",
	"style": "new-york",
	"tailwind": {
		"config": "tailwind.config.ts",
		"css": "src/app.css",
		"baseColor": "stone"
	},
	"aliases": {
		"components": "$lib/components",
		"utils": "$lib/utils",
		"ui": "$lib/components/ui",
		"hooks": "$lib/hooks"
	},
	"typescript": true,
	"registry": "https://next.shadcn-svelte.com/registry"
}

```

# sk/package.json

```json
{
  "name": "sk",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "bunx --bun vite dev",
    "dev:backend": "cd ../pb && go install github.com/cortesi/modd/cmd/modd@latest && modd",
    "backend": "AUDITLOG=users,posts ../pb/entrypoint.sh ./pocketbase serve --publicDir=../sk/build",
    "build": "bunx --bun vite build",
    "build:backend": "cd ../pb && go build",
    "typegen": "bunx pocketbase-typegen --db ../pb/pb_data/data.db --out ./src/lib/pocketbase/generated-types.ts",
    "test": "bunx playwright test",
    "preview": "bunx --bun vite preview",
    "check": "bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json --watch",
    "lint": "bunx prettier --check .",
    "format": "bunx prettier --write ."
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.0.0",
    "@sveltejs/adapter-static": "^3.0.1",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "@tailwindcss/forms": "^0.5.10",
    "@tailwindcss/typography": "^0.5.16",
    "autoprefixer": "^10.4.20",
    "bits-ui": "^1.3.4",
    "clsx": "^2.1.1",
    "pocketbase-typegen": "^1.2.1",
    "prettier": "^3.1.1",
    "prettier-plugin-svelte": "^3.1.2",
    "prettier-plugin-tailwindcss": "^0.6.10",
    "sass": "^1.77.1",
    "svelte": "^5.0.0-next.1",
    "svelte-check": "^3.6.0",
    "svelte-preprocess": "^5.1.4",
    "tailwind-merge": "^3.0.2",
    "tailwind-variants": "^0.3.1",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "tslib": "^2.4.1",
    "typescript": "^5.0.0",
    "vite": "^5.0.3"
  },
  "type": "module",
  "dependencies": {
    "pocketbase": "^0.21.2",
    "zod": "^3.23.8"
  }
}

```

# sk/playwright.config.ts

```ts
import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  use: {
    headless: false,
    // viewport: { width: 1280, height: 768 },
    // video: "on-first-retry",
    // make sure "npm run dev" is running for localhost:5173 to work
    baseURL: "http://localhost:5173",
  },
  reporter: [["html"]],
};

export default config;

```

# sk/postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

```

# sk/README.md

```md
# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/main/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

\`\`\`bash
# create a new project in the current directory
bun create svelte@latest

# create a new project in my-app
bun create svelte@latest my-app
\`\`\`

## Developing

Once you've created a project and installed dependencies with `bun install`, start a development server:

\`\`\`bash
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
\`\`\`

## Building

To create a production version of your app:

\`\`\`bash
bun run build
\`\`\`

You can preview the production build with `bun run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

```

# sk/src/app.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 20 14.3% 4.1%;
    --muted: 60 4.8% 95.9%;
    --muted-foreground: 25 5.3% 44.7%;
    --popover: 0 0% 100%;
    --popover-foreground: 20 14.3% 4.1%;
    --card: 0 0% 100%;
    --card-foreground: 20 14.3% 4.1%;
    --border: 20 5.9% 90%;
    --input: 20 5.9% 90%;
    --primary: 24 9.8% 10%;
    --primary-foreground: 60 9.1% 97.8%;
    --secondary: 60 4.8% 95.9%;
    --secondary-foreground: 24 9.8% 10%;
    --accent: 60 4.8% 95.9%;
    --accent-foreground: 24 9.8% 10%;
    --destructive: 0 72.2% 50.6%;
    --destructive-foreground: 60 9.1% 97.8%;
    --ring: 20 14.3% 4.1%;
    --radius: 0.5rem;
	--sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 20 14.3% 4.1%;
    --foreground: 60 9.1% 97.8%;
    --muted: 12 6.5% 15.1%;
    --muted-foreground: 24 5.4% 63.9%;
    --popover: 20 14.3% 4.1%;
    --popover-foreground: 60 9.1% 97.8%;
    --card: 20 14.3% 4.1%;
    --card-foreground: 60 9.1% 97.8%;
    --border: 12 6.5% 15.1%;
    --input: 12 6.5% 15.1%;
    --primary: 60 9.1% 97.8%;
    --primary-foreground: 24 9.8% 10%;
    --secondary: 12 6.5% 15.1%;
    --secondary-foreground: 60 9.1% 97.8%;
    --accent: 12 6.5% 15.1%;
    --accent-foreground: 60 9.1% 97.8%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 60 9.1% 97.8%;
    --ring: 24 5.7% 82.9%;
	--sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

# sk/src/app.d.ts

```ts
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    interface PageState {
      selected: any;
    }
    // interface Platform {}
  }
}

export {};

```

# sk/src/app.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.svg" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.min.css" />
    <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>

```

# sk/src/app.scss

```scss
html {
  display: flex;
  flex-flow: column;
  min-height: 100vh;
  body {
    flex: 1 1 auto;
    display: flex;
    flex-flow: column;
    // override max-width water.css
    width: 100%;
    max-width: unset;
    // no horizonal scrollbars
    overflow-x: hidden;
    // override default fonts
    font-family:
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      Fira Sans,
      Droid Sans,
      Helvetica Neue,
      Segoe UI Emoji,
      Apple Color Emoji,
      Noto Color Emoji,
      sans-serif;
  }
}

.container {
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
}

.flex {
  display: flex;
  flex-direction: column;
  &.h {
    flex-direction: row;
  }
}

.bg-diagonal {
  background-color: #e5e5f7;
  opacity: 0.8;
  background-size: 10px 10px;
  background-image: repeating-linear-gradient(
    45deg,
    #444cf7 0,
    #444cf7 1px,
    #e5e5f7 0,
    #e5e5f7 50%
  );
}

a.button {
  display: inline-block;
  text-decoration: none;
  background-color: var(--button-base);
  color: var(--form-text);
  margin-right: 6px;
  margin-bottom: 6px;
  padding: 10px;
  border: none;
  border-radius: 6px;
  outline: none;
  padding-right: 30px;
  padding-left: 30px;
}

a.button,
button {
  &.small {
    padding: 0;
    margin: 0 0;
    width: 2.5em;
    height: 2.5em;
  }
  &.round {
    border-radius: 100%;
  }
}

[data-label] {
  position: relative;
  display: flex;
  &::after {
    position: absolute;
    top: 0;
    right: 0;
    color: var(--text-muted);
    content: attr(data-label);
    margin-right: 0.75em;
    font-size: 75%;
    transition: all 0.3s;
  }
  &:focus-within::after {
    font-weight: bold;
  }
}

pre.body {
  white-space: pre-wrap;
}

```

# sk/src/hooks.js

```js
import { base } from "$app/paths";

/** @type {import('@sveltejs/kit').Reroute} */
export function reroute({ url }) {
  const { pathname } = url;
  const [_, coll = "", id = "", op = ""] =
    pathname.match(/([^\/]+)\/([^\/]+)\/([^\/]+)\/?$/) || [];
  // implement virtual routes (aliases): .../delete and .../auditlog
  if (op === "auditlog" || op === "delete") {
    // render a different route (base route)
    // works only with some help from +layout.svelte in that path
    return `${base}/${coll}/${id}`;
  }
}

```

# sk/src/lib/components/Alerts.svelte

```svelte
<script lang="ts" context="module">
  interface Alert {
    message: string;
    type: string;
    timeout?: number;
    html?: boolean;
  }

  let _alerts = $state<Alert[]>([]);
  export const alerts = {
    add({ message, type = "info", timeout = 0, html = false }: Alert) {
      const alert = { message, type, html };
      _alerts = _alerts.concat(alert);
      if (timeout) {
        setTimeout(() => {
          dismiss(alert);
        }, timeout);
      }
    },
    info(message: string, timeout = 0) {
      this.add({ message, type: "info", timeout });
    },
    success(message: string, timeout = 0) {
      this.add({ message, type: "success", timeout });
    },
    warning(message: string, timeout = 0) {
      this.add({ message, type: "warning", timeout });
    },
    error(message: string, timeout = 0) {
      this.add({ message, type: "error", timeout });
    },
  };

  export function errorAlert(message: string) {
    const type = "error";
  }

  function dismiss(alert: Alert) {
    _alerts = _alerts.filter((a) => a !== alert);
  }

  function dismissAll() {
    _alerts = [];
  }
  function onunhandledrejection(e: PromiseRejectionEvent) {
    alerts.error(e.reason.toString());
    const { data = {} } = e.reason.response ?? {};
    for (const [key, value] of Object.entries(data)) {
      alerts.error(`${key}: ${value?.message}`);
    }
  }
</script>

<!-- to display alerts for unhandled promise rejections -->
<svelte:window {onunhandledrejection} />

<article>
  {#if _alerts.length > 1}
    <button onclick={dismissAll} class="dismiss">&times; dismiss all</button>
  {/if}
  {#each _alerts as alert}
    <blockquote class={alert.type}>
      <button onclick={() => dismiss(alert)} class="dismiss">&times;</button>
      {#if alert.html}
        {@html alert.message}
      {:else}
        {alert.message}
      {/if}
    </blockquote>
  {/each}
</article>

<style>
  .dismiss {
    cursor: pointer;
    padding: 2px 7px;
    border-radius: 15px;
  }
  blockquote {
    margin: 0 0;
  }
  .success {
    color: var(--links);
    border-left-color: var(--links);
  }
  .warning {
    color: var(--variable);
    border-left-color: var(--selection);
  }
  .error {
    color: var(--danger);
    border-left-color: var(--variable);
  }
</style>

```

# sk/src/lib/components/DateShow.svelte

```svelte
<script lang="ts">
  const { date }: { date: string } = $props();
  // year = dt.getFullYear();
  // dom = dt.getDate();
  // dow = dt.getDay();
  // mon = dt.getMonth();
  const dt = $derived(new Date(date));
  const [dowName, monName, dom, year] = $derived(dt.toDateString().split(" "));
</script>

<div class="date" title={dt.toLocaleString()}>
  <div class="dow">{dowName}</div>
  <div>
    <div class="mon">{monName}</div>
    <div class="dom">{dom}</div>
  </div>
  <div class="year">{year}</div>
</div>

<style lang="scss">
  .date {
    display: inline-flex;
    background-color: var(--border);
    border-radius: 50%;
    height: 5em;
    aspect-ratio: 1;
    padding: 0.5em;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: var(--font-alt);
    > div {
      display: flex;
      flex-direction: row;
      gap: 0.25em;
      > * {
        font-weight: bold;
      }
    }
  }
</style>

```

# sk/src/lib/components/Delete.svelte

```svelte
<script lang="ts">
  import { goto } from "$app/navigation";
  import { client } from "$lib/pocketbase";
  import { alertOnFailure } from "$lib/pocketbase/ui";

  const {
    id,
    table,
    return_path = "back",
  }: { id: string; table: string; return_path?: string } = $props();
  async function back() {
    if (return_path === "back") {
      history.back();
    } else {
      await goto(return_path);
    }
  }
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    alertOnFailure(async () => {
      await client.collection(table).delete(id);
      await back();
    });
  }
</script>

<form onsubmit={submit}>
  <article>
    <aside>Are you sure you want to delete the following record?</aside>
  </article>
  <button type="submit">Yes - Proceed</button>
  <button type="reset" onclick={back}>No - Cancel</button>
</form>

```

# sk/src/lib/components/Dialog.svelte

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";

  const {
    trigger = _trigger,
    children,
  }: { trigger?: Snippet<[() => void]>; children: Snippet<[]> } = $props();
  let dialog: HTMLDialogElement;
  function show() {
    dialog.showModal();
  }
  function close(e: any) {
    function inClientRect(element: Element, event: MouseEvent) {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return (
        event.clientX >= left &&
        event.clientX <= right &&
        event.clientY >= top &&
        event.clientY <= bottom
      );
    }
    // if the user clicks on the dialog's backdrop
    if (e?.target === dialog && !inClientRect(dialog, e)) {
      dialog.close();
    }
  }
  $effect(() => {
    dialog.addEventListener("click", close);
  });
</script>

{#snippet _trigger(show)}
  <button onclick={show}>Open Dialog</button>
{/snippet}

{@render trigger(show)}
<dialog bind:this={dialog}>
  {@render children()}
</dialog>

```

# sk/src/lib/components/FileInput.svelte

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    fileInput = $bindable<HTMLInputElement>(),
    pasteFile = false, // this component captures the paste event and data
    children = _children,
    ...props // any other props or attributes will be passed to the file input
  }: {
    fileInput?: HTMLInputElement;
    pasteFile?: boolean;
    children?: Snippet<[]>;
    [key: string]: any;
  } = $props();
  function onpaste(e: ClipboardEvent) {
    if (pasteFile && e.clipboardData?.files) {
      fileInput.files = e.clipboardData.files;
    }
  }
  $effect(() => {
    // listen for changes to the file input files
    fileInput?.addEventListener("change", () => (files = fileInput?.files));
  });
  let files: FileList | null = $state(null);
</script>

{#snippet _children()}
  <div class="files">
    {#each files || [] as file}
      <span>{file.name}</span>
    {:else}
      drag/drop files here
    {/each}
  </div>
{/snippet}

<!-- When someone pastes a file anywhere on body, send it to this component -->
<svelte:body {onpaste} />

<label class="file">
  <div>
    {@render children()}
  </div>
  <input bind:this={fileInput} type="file" {...props} />
</label>

<style lang="scss">
  label {
    cursor: pointer;
    border: dashed 2px gray;
    padding: 1em;
    position: relative;
    display: flex;
    justify-content: center;
    input[type="file"] {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      opacity: 0; // make it transparent (invisible)
      padding: 0;
      margin: 0;
      cursor: pointer;
    }
  }
  .files > span {
    display: inline-block;
    margin-right: 0.5em;
    margin-bottom: 0.25em;
    padding: 0 0.5em;
    border: dotted 1px;
  }
</style>

```

# sk/src/lib/components/Link2Modal.svelte

```svelte
<script lang="ts">
  import { invalidateAll, preloadData, pushState } from "$app/navigation";
  import { page } from "$app/stores";
  import type { ComponentType, Snippet, SvelteComponent } from "svelte";
  import Alerts from "./Alerts.svelte";

  const {
    component,
    trigger,
  }: {
    trigger: Snippet<[(e: MouseEvent) => void]>;
    component: ComponentType<SvelteComponent<{ data: any }>>;
  } = $props();

  let dialog: HTMLDialogElement | undefined = $state();

  async function onclick(e: MouseEvent) {
    if (e.metaKey || e.ctrlKey) return;
    const { href } = e.currentTarget as HTMLAnchorElement;

    // run `load` functions (or rather, get the result of the `load` functions
    // that are already running because of `data-sveltekit-preload-data`)
    const result = await preloadData(href);

    if (result.type === "loaded" && result.status === 200) {
      pushState(href, { selected: result.data });
      e.preventDefault();
    }
  }

  async function onclose() {
    await invalidateAll();
    history.back();
  }

  $effect(() => {
    if ($page.state.selected && dialog) {
      dialog.showModal();
    }
  });
</script>

{#if $page.state.selected}
  <dialog bind:this={dialog} {onclose}>
    <button type="button" class="dismiss" onclick={onclose}>&times;</button>
    <Alerts />
    <h2>{$page.state.selected.metadata.headline}</h2>
    <svelte:component this={component} data={$page.state.selected} />
  </dialog>
{/if}

{@render trigger(onclick)}

<style>
  .dismiss {
    border-radius: 5rem;
    padding: 0 0;
    width: 2em;
    height: 2em;
    position: absolute;
    top: 0;
    right: 0;
    margin: 6px 6px;
  }
</style>

```

# sk/src/lib/components/login-form.svelte

```svelte
<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
</script>

<Card.Root class="mx-auto max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Login</Card.Title>
		<Card.Description>Enter your email below to login to your account</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="grid gap-4">
			<div class="grid gap-2">
				<Label for="email">Email</Label>
				<Input id="email" type="email" placeholder="m@example.com" required />
			</div>
			<div class="grid gap-2">
				<div class="flex items-center">
					<Label for="password">Password</Label>
					<a href="##" class="ml-auto inline-block text-sm underline">
						Forgot your password?
					</a>
				</div>
				<Input id="password" type="password" required />
			</div>
			<Button type="submit" class="w-full">Login</Button>
			<Button variant="outline" class="w-full">Login with Google</Button>
		</div>
		<div class="mt-4 text-center text-sm">
			Don't have an account?
			<a href="##" class="underline"> Sign up </a>
		</div>
	</Card.Content>
</Card.Root>

```

# sk/src/lib/components/login-page.svelte

```svelte
<script lang="ts">
	import LoginForm from "$lib/components/login-form.svelte";
</script>

<div class="flex h-screen w-full items-center justify-center px-4">
	<LoginForm />
</div>

```

# sk/src/lib/components/LoginBadge.svelte

```svelte
<script lang="ts">
  import { onDestroy } from "svelte";
  import { authModel, client } from "../pocketbase";
  import Alerts, { alerts } from "./Alerts.svelte";
  import Dialog from "./Dialog.svelte";
  import LoginForm from "./LoginForm.svelte";
  const { signupAllowed = true } = $props();
  async function logout() {
    client.authStore.clear();
  }
  const unsubscribe = client.authStore.onChange((token, model) => {
    if (model) {
      const { name, username } = model;
      alerts.success(`Signed in as ${name || username || "Admin"}`, 5000);
    } else {
      alerts.success(`Signed out`, 5000);
    }
  }, false);
  onDestroy(() => {
    unsubscribe();
  });
</script>

{#if $authModel}
  <Dialog>
    {#snippet trigger(show)}
      <button class="badge" onclick={show}>
        {#if $authModel.avatar}
          <img
            src={client.getFileUrl($authModel, $authModel.avatar)}
            alt="profile pic"
          />
        {/if}
        <samp
          >{$authModel?.name || $authModel?.username || $authModel?.email}</samp
        >
      </button>
    {/snippet}
    <div class="wrapper">
      <div class="badge">
        {#if $authModel.avatar}
          <img
            src={client.getFileUrl($authModel, $authModel.avatar)}
            alt="profile pic"
          />
        {/if}
        <samp
          >{$authModel?.name ?? $authModel?.username ?? $authModel?.email}</samp
        >
      </div>
      <button onclick={logout}>Sign Out</button>
    </div>
  </Dialog>
{:else}
  <Dialog>
    {#snippet trigger(show)}
      <button onclick={show}>
        {signupAllowed ? "Sign In / Sign Up" : "Sign In"}
      </button>
    {/snippet}
    <Alerts />
    <LoginForm {signupAllowed} />
  </Dialog>
{/if}

<style lang="scss">
  .badge {
    padding: 0;
    background-color: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    > img {
      height: 2em;
      width: 2em;
      border-radius: 50%;
    }
    > samp {
      display: inline-block !important;
      -moz-border-radius: 20px !important;
      -webkit-border-radius: 20px !important;
      -khtml-border-radius: 20px !important;
      border-radius: 20px !important;
      padding: 0.5rem !important;
      text-align: center !important;
      line-height: 1.5rem !important;
    }
  }
  .wrapper {
    display: flex;
    flex-direction: column;
  }
</style>

```

# sk/src/lib/components/LoginForm.svelte

```svelte
<script lang="ts">
  const {
    authCollection = "users",
    passwordLogin = true,
    signupAllowed = true,
  } = $props();
  import { client, providerLogin } from "../pocketbase";
  import TabGroup from "./TabGroup.svelte";
  import Tab from "./Tab.svelte";
  import TabContent from "./TabContent.svelte";
  const coll = client.collection(authCollection);

  const form = $state({
    email: "",
    name: "",
    password: "",
    passwordConfirm: "",
    admin: false,
  });
  let signup = false;

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (signup) {
      await coll.create({ ...form });
    }
    // signin
    if (form.admin) {
      await client.admins.authWithPassword(form.email, form.password);
    } else {
      await coll.authWithPassword(form.email, form.password);
    }
  }
  let active = $state("SignIn");
</script>

{#snippet signin()}
  <input bind:value={form.email} required type="text" placeholder="email" />
  <input
    bind:value={form.password}
    required
    type="password"
    placeholder="password"
  />
  <label title="sign-in as admin">
    <input type="checkbox" bind:checked={form.admin} />Admin
  </label>
  <button type="submit" onclick={() => (signup = false)}>Sign In</button>
{/snippet}

<form onsubmit={submit}>
  {#if passwordLogin}
    {#if signupAllowed}
      <TabGroup bind:active>
        {#snippet tabs()}
          <Tab key="SignIn">Sign In</Tab>
          <Tab key="SignUp">Sign Up</Tab>
        {/snippet}
        <TabContent key="SignIn">
          {@render signin()}
        </TabContent>
        <TabContent key="SignUp">
          <input
            bind:value={form.email}
            required
            type="text"
            placeholder="email"
          />
          <input
            bind:value={form.password}
            required
            type="password"
            placeholder="password"
          />
          <input
            bind:value={form.passwordConfirm}
            required
            type="password"
            placeholder="confirm password"
          />
          <input
            bind:value={form.name}
            required
            type="text"
            placeholder="name / label"
          />
          <input type="hidden" name="register" value={true} />
          <button type="submit" onclick={() => (signup = true)}>Sign Up</button>
        </TabContent>
      </TabGroup>
    {:else}
      <h2>Sign In</h2>
      {@render signin()}
    {/if}
  {/if}
  {#await coll.listAuthMethods({ $autoCancel: false }) then methods}
    {#each methods.authProviders as p}
      <button type="button" onclick={() => providerLogin(p, coll)}
        >Sign-in with {p.name}</button
      >
    {/each}
  {:catch}
    <!-- pocketbase not working -->
  {/await}
</form>

```

# sk/src/lib/components/LoginGuard.svelte

```svelte
<script lang="ts">
  import { goto } from "$app/navigation";
  import { authModel, client } from "$lib/pocketbase";
  import type { Snippet } from "svelte";
  import type { BaseAuthStore } from "pocketbase";
  const {
    admin,
    destination,
    otherwise,
    children,
  }: {
    admin?: boolean;
    destination?: string;
    otherwise?: Snippet<[]>;
    children: Snippet<[]>;
  } = $props();
  $effect(() => {
    if (!!destination && client.authStore.isValid) {
      // navigate to destination if specified, and logged in
      goto(destination);
    }
  });
  const authorized = $derived(
    $authModel && //  must be logged in
      // if admin is specified -- must be admin if admin true, must not be admin if admin false
      (admin === undefined || admin === client.authStore.isAdmin)
  );
</script>

{#if authorized}
  {@render children()}
{:else if otherwise}
  {@render otherwise()}
{/if}

```

# sk/src/lib/components/Nav.svelte

```svelte
<script lang="ts">
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  const links = [
    ["/", "Home"],
    ["/posts/", "Posts"],
    ["/hello/", "Hello"],
  ];
</script>

<nav>
  {#each links as [path, label]}
    {@const active = $page.url.pathname == path}
    <a href={`${base}${path}`} class:active>{label}</a>
  {/each}
</nav>

<style lang="scss">
  nav {
    a {
      padding: 0.5em 1em;
      margin: 0;
      border-radius: 0;
      background: var(--background-alt);
      border-bottom: solid var(--background);
      &.active {
        background: var(--background);
        font-weight: bold;
        border-bottom: solid var(--links);
      }
      &:first-child {
        border-top-left-radius: 0.5rem;
        border-bottom-left-radius: 0.5rem;
      }
      &:last-child {
        border-top-right-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
      }
    }
  }
</style>

```

# sk/src/lib/components/Spinner.svelte

```svelte
<script lang="ts" context="module">
  import { writable } from "svelte/store";

  // returns a store that:
  // starts out false
  // becomes true when the async function f starts running
  // becomes false when f resolves (or rejects)
  export function activityStore<T>(f: (t: T) => Promise<any>) {
    const store = writable(false);
    async function run(data: T) {
      try {
        store.set(true);
        return await f(data);
      } finally {
        store.set(false);
      }
    }
    return { ...store, run };
  }
</script>

<script lang="ts">
  let { active }: { active: boolean } = $props();
</script>

<!--
  @component
  \`\`\`svelte
  <Spinner 
  \`\`\`
 -->
<span class="loader" class:active></span>

<style lang="scss">
  .loader {
    width: 1em;
    height: 1em;
    border: 0.2em solid var(--links);
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    &.active {
      border-bottom-color: transparent; // 3/4 border solid, 1/4 transparent
      animation: rotation 1s linear infinite;
    }
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>

```

# sk/src/lib/components/Tab.svelte

```svelte
<script lang="ts">
  import { page } from "$app/stores";
  import { getContext, type Snippet } from "svelte";
  import type { Writable } from "svelte/store";

  const active = getContext<Writable<string>>("active");
  const {
    key,
    pathname,
    children = _children,
  }: { key: string; pathname?: string; children?: Snippet<[]> } = $props();
  $effect(() => {
    if ($page.url.pathname === pathname) {
      $active = key;
    }
  });
</script>

<!--
 @component
 Tab in a `TabGroup` component.
 - `key` must be unique.
 - `pathname` is optional and if provided is used to determine which tab is active
 You can provide `children` to render the content of the tab, or else by default
 button with `key` as the text will be rendered.
-->

{#snippet _children()}
  {key}
{/snippet}

<span
  class="tab"
  class:active={$active === key}
  onclick={() => ($active = key)}
  onkeypress={(e) => (e.key === "Enter" || e.key === " ") && ($active = key)}
  role="tab"
  aria-label={key}
  tabindex="0"
>
  {@render children()}
</span>

<style lang="scss">
  .tab {
    display: inline-block;
    padding: 1em;
    margin-bottom: 0;
    border-radius: 6px 6px 0 0;
    color: var(--tab-color-fg, --text-bright);
    background-color: var(--tab-color-bg, var(--background-alt));
    cursor: pointer;
    &.active {
      color: var(--tab-color-active-fg, var(--background-alt));
      background-color: var(--tab-color-active-bg, var(--text-bright));
    }
  }
</style>

```

# sk/src/lib/components/TabContent.svelte

```svelte
<script lang="ts">
  import { getContext, type Snippet } from "svelte";
  import type { Writable } from "svelte/store";

  let { key, children }: { key: string; children: Snippet<[]> } = $props();

  const store: Writable<string | number> = getContext("active");
</script>

{#if $store === key}
  {@render children()}
{/if}

```

# sk/src/lib/components/TabGroup.svelte

```svelte
<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import { writable } from "svelte/store";

  let {
    active = $bindable(""),
    tabs,
    children,
  }: {
    active?: string;
    defaultTab?: string;
    tabs: Snippet<[]>;
    children: Snippet<[]>;
  } = $props();
  const activeStore = writable(active);
  // make `active` reflect $activeStore
  activeStore.subscribe((value) => (active = value));
  setContext("active", activeStore);
</script>

<!--
@component
Component to build a tabbed interface. It contains ...
- bindable prop `active`
- `tabs` snippet containing `Tab` components. Each `Tab` component:
  - must have `key`
  - `pathname` is optional and if provided is used to determine which tab is active
- child content that renders the content of the active tab

Example:
\`\`\`svelte
<Tabs bind:active>
  {#snippet tabs()}
    <a href="{base}/posts/{record.slug}/">
      <Tab key="view" pathname="/posts/{record.slug}/">View</Tab>
    </a>
    <a href="{base}/posts/{record.slug}/edit/">
      <Tab key="edit" pathname="/posts/{record.slug}/edit/">Edit</Tab>
    </a>
    <a href="{base}/posts/{record.slug}/delete/">
      <Tab key="delete" pathname="/posts/{record.slug}/delete/">Delete</Tab>
    </a>
  {/snippet}
  <p>Active tab: {active}</p>
</Tabs>
\`\`\`
-->

<div class="tabs">
  {@render tabs()}
</div>

{@render children()}

<style lang="scss">
  .tabs {
    border-bottom: solid var(--tab-color-active-bg, var(--text-bright)) 1px;
    margin-bottom: 1rem;
  }
</style>

```

# sk/src/lib/components/ui/button/button.svelte

```svelte
<script lang="ts" module>
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const buttonVariants = tv({
		base: "focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
				outline:
					"border-input bg-background hover:bg-accent hover:text-accent-foreground border shadow-sm",
				secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 rounded-md px-3 text-xs",
				lg: "h-10 rounded-md px-8",
				icon: "h-9 w-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		class={cn(buttonVariants({ variant, size }), className)}
		{href}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}

```

# sk/src/lib/components/ui/button/index.ts

```ts
import Root, {
	type ButtonProps,
	type ButtonSize,
	type ButtonVariant,
	buttonVariants,
} from "./button.svelte";

export {
	Root,
	type ButtonProps as Props,
	//
	Root as Button,
	buttonVariants,
	type ButtonProps,
	type ButtonSize,
	type ButtonVariant,
};

```

# sk/src/lib/components/ui/card/card-content.svelte

```svelte
<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} class={cn("p-6", className)} {...restProps}>
	{@render children?.()}
</div>

```

# sk/src/lib/components/ui/card/card-description.svelte

```svelte
<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();
</script>

<p bind:this={ref} class={cn("text-muted-foreground text-sm", className)} {...restProps}>
	{@render children?.()}
</p>

```

# sk/src/lib/components/ui/card/card-footer.svelte

```svelte
<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} class={cn("flex items-center p-6 pt-0", className)} {...restProps}>
	{@render children?.()}
</div>

```

# sk/src/lib/components/ui/card/card-header.svelte

```svelte
<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} class={cn("flex flex-col space-y-1.5 p-6 pb-0", className)} {...restProps}>
	{@render children?.()}
</div>

```

# sk/src/lib/components/ui/card/card-title.svelte

```svelte
<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		level = 3,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		level?: 1 | 2 | 3 | 4 | 5 | 6;
	} = $props();
</script>

<div
	role="heading"
	aria-level={level}
	bind:this={ref}
	class={cn("font-semibold leading-none tracking-tight", className)}
	{...restProps}
>
	{@render children?.()}
</div>

```

# sk/src/lib/components/ui/card/card.svelte

```svelte
<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	class={cn("bg-card text-card-foreground rounded-xl border shadow", className)}
	{...restProps}
>
	{@render children?.()}
</div>

```

# sk/src/lib/components/ui/card/index.ts

```ts
import Root from "./card.svelte";
import Content from "./card-content.svelte";
import Description from "./card-description.svelte";
import Footer from "./card-footer.svelte";
import Header from "./card-header.svelte";
import Title from "./card-title.svelte";

export {
	Root,
	Content,
	Description,
	Footer,
	Header,
	Title,
	//
	Root as Card,
	Content as CardContent,
	Description as CardDescription,
	Footer as CardFooter,
	Header as CardHeader,
	Title as CardTitle,
};

```

# sk/src/lib/components/ui/input/index.ts

```ts
import Root from "./input.svelte";

export {
	Root,
	//
	Root as Input,
};

```

# sk/src/lib/components/ui/input/input.svelte

```svelte
<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import type { WithElementRef } from "bits-ui";
	import { cn } from "$lib/utils.js";

	type InputType = Exclude<HTMLInputTypeAttribute, "file">;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, "type"> &
			({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		...restProps
	}: Props = $props();
</script>

{#if type === "file"}
	<input
		bind:this={ref}
		class={cn(
			"border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		class={cn(
			"border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}

```

# sk/src/lib/components/ui/label/index.ts

```ts
import Root from "./label.svelte";

export {
	Root,
	//
	Root as Label,
};

```

# sk/src/lib/components/ui/label/label.svelte

```svelte
<script lang="ts">
	import { Label as LabelPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	class={cn(
		"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
		className
	)}
	{...restProps}
/>

```

# sk/src/lib/pocketbase/FileField.svelte

```svelte
<script lang="ts">
  import { client } from ".";

  let {
    record,
    fieldName,
    toBeRemoved = $bindable([]),
  }: { record: any; fieldName: string; toBeRemoved?: string[] } = $props();
</script>

<table>
  <thead>
    <tr>
      <th>file</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {#each record[fieldName] as file, index}
      {@const deleted = toBeRemoved.includes(file)}
      {@const icon = deleted ? "trash-alt" : "trash"}
      {@const title = deleted ? "click to restore" : "click to remove"}
      {@const onclick = deleted
        ? () => (toBeRemoved = toBeRemoved.filter((f) => f !== file))
        : () => (toBeRemoved = [...toBeRemoved, file])}
      <tr>
        <td class:deleted>
          <a href={client.files.getUrl(record, file)} target="_blank">
            {file}
          </a>
        </td>
        <td>
          <button type="button" class="small round" {onclick} {title}>
            <i class="bx bx-{icon}"></i>
          </button>
        </td>
      </tr>
    {:else}
      <tr>
        <td colspan="3">No files attached to this record.</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .deleted {
    text-decoration: line-through;
  }
</style>

```

# sk/src/lib/pocketbase/generated-types.ts

```ts
/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Auditlog = "auditlog",
	Hooks = "hooks",
	Posts = "posts",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuditlogRecord<Tdata = unknown, Toriginal = unknown> = {
	admin?: string
	collection: string
	data?: null | Tdata
	event: string
	original?: null | Toriginal
	record: string
	user?: RecordIdString
}

export enum HooksEventOptions {
	"insert" = "insert",
	"update" = "update",
	"delete" = "delete",
}

export enum HooksActionTypeOptions {
	"command" = "command",
	"email" = "email",
	"post" = "post",
}
export type HooksRecord = {
	action: string
	action_params?: string
	action_type: HooksActionTypeOptions
	collection: string
	disabled?: boolean
	event: HooksEventOptions
	expands?: string
}

export type PostsRecord = {
	body: string
	files?: string[]
	slug: string
	title: string
	user?: RecordIdString
}

export type UsersRecord = {
	avatar?: string
	name?: string
}

// Response types include system fields and match responses from the PocketBase API
export type AuditlogResponse<Tdata = unknown, Toriginal = unknown, Texpand = unknown> = Required<AuditlogRecord<Tdata, Toriginal>> & BaseSystemFields<Texpand>
export type HooksResponse<Texpand = unknown> = Required<HooksRecord> & BaseSystemFields<Texpand>
export type PostsResponse<Texpand = unknown> = Required<PostsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	auditlog: AuditlogRecord
	hooks: HooksRecord
	posts: PostsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	auditlog: AuditlogResponse
	hooks: HooksResponse
	posts: PostsResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: 'auditlog'): RecordService<AuditlogResponse>
	collection(idOrName: 'hooks'): RecordService<HooksResponse>
	collection(idOrName: 'posts'): RecordService<PostsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}

```

# sk/src/lib/pocketbase/Image.svelte

```svelte
<script lang="ts">
  import { client } from "$lib/pocketbase";
  // credit: https://css-tricks.com/lodge/svg/09-svg-data-uris/
  const internal_fallback_img =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDEwMCAxMDAiIHhtbDpzcGFjZT0icHJlc2VydmUiIGhlaWdodD0iMTAwcHgiIHdpZHRoPSIxMDBweCI+CjxnPgoJPHBhdGggZD0iTTI4LjEsMzYuNmM0LjYsMS45LDEyLjIsMS42LDIwLjksMS4xYzguOS0wLjQsMTktMC45LDI4LjksMC45YzYuMywxLjIsMTEuOSwzLjEsMTYuOCw2Yy0xLjUtMTIuMi03LjktMjMuNy0xOC42LTMxLjMgICBjLTQuOS0wLjItOS45LDAuMy0xNC44LDEuNEM0Ny44LDE3LjksMzYuMiwyNS42LDI4LjEsMzYuNnoiLz4KCTxwYXRoIGQ9Ik03MC4zLDkuOEM1Ny41LDMuNCw0Mi44LDMuNiwzMC41LDkuNWMtMyw2LTguNCwxOS42LTUuMywyNC45YzguNi0xMS43LDIwLjktMTkuOCwzNS4yLTIzLjFDNjMuNywxMC41LDY3LDEwLDcwLjMsOS44eiIvPgoJPHBhdGggZD0iTTE2LjUsNTEuM2MwLjYtMS43LDEuMi0zLjQsMi01LjFjLTMuOC0zLjQtNy41LTctMTEtMTAuOGMtMi4xLDYuMS0yLjgsMTIuNS0yLjMsMTguN0M5LjYsNTEuMSwxMy40LDUwLjIsMTYuNSw1MS4zeiIvPgoJPHBhdGggZD0iTTksMzEuNmMzLjUsMy45LDcuMiw3LjYsMTEuMSwxMS4xYzAuOC0xLjYsMS43LTMuMSwyLjYtNC42YzAuMS0wLjIsMC4zLTAuNCwwLjQtMC42Yy0yLjktMy4zLTMuMS05LjItMC42LTE3LjYgICBjMC44LTIuNywxLjgtNS4zLDIuNy03LjRjLTUuMiwzLjQtOS44LDgtMTMuMywxMy43QzEwLjgsMjcuOSw5LjgsMjkuNyw5LDMxLjZ6Ii8+Cgk8cGF0aCBkPSJNMTUuNCw1NC43Yy0yLjYtMS02LjEsMC43LTkuNywzLjRjMS4yLDYuNiwzLjksMTMsOCwxOC41QzEzLDY5LjMsMTMuNSw2MS44LDE1LjQsNTQuN3oiLz4KCTxwYXRoIGQ9Ik0zOS44LDU3LjZDNTQuMyw2Ni43LDcwLDczLDg2LjUsNzYuNGMwLjYtMC44LDEuMS0xLjYsMS43LTIuNWM0LjgtNy43LDctMTYuMyw2LjgtMjQuOGMtMTMuOC05LjMtMzEuMy04LjQtNDUuOC03LjcgICBjLTkuNSwwLjUtMTcuOCwwLjktMjMuMi0xLjdjLTAuMSwwLjEtMC4yLDAuMy0wLjMsMC40Yy0xLDEuNy0yLDMuNC0yLjksNS4xQzI4LjIsNDkuNywzMy44LDUzLjksMzkuOCw1Ny42eiIvPgoJPHBhdGggZD0iTTI2LjIsODguMmMzLjMsMiw2LjcsMy42LDEwLjIsNC43Yy0zLjUtNi4yLTYuMy0xMi42LTguOC0xOC41Yy0zLjEtNy4yLTUuOC0xMy41LTktMTcuMmMtMS45LDgtMiwxNi40LTAuMywyNC43ICAgQzIwLjYsODQuMiwyMy4yLDg2LjMsMjYuMiw4OC4yeiIvPgoJPHBhdGggZD0iTTMwLjksNzNjMi45LDYuOCw2LjEsMTQuNCwxMC41LDIxLjJjMTUuNiwzLDMyLTIuMyw0Mi42LTE0LjZDNjcuNyw3Niw1Mi4yLDY5LjYsMzcuOSw2MC43QzMyLDU3LDI2LjUsNTMsMjEuMyw0OC42ICAgYy0wLjYsMS41LTEuMiwzLTEuNyw0LjZDMjQuMSw1Ny4xLDI3LjMsNjQuNSwzMC45LDczeiIvPgo8L2c+Cjwvc3ZnPg==";
  const {
    record,
    file,
    thumb = "100x100",
    fallback = "internal",
    ...rest
  }: {
    record: any;
    file: string;
    thumb?: string;
    fallback?: "internal" | "external";
  } = $props();
  const src = $derived(
    file
      ? client.getFileUrl(record, file, { thumb })
      : fallback === "external"
        ? `https://via.placeholder.com/${thumb}`
        : internal_fallback_img
  );
</script>

<!-- svelte-ignore a11y-missing-attribute -->
<img {...rest} {src} rel="noreferrer" />

```

# sk/src/lib/pocketbase/ImgModal.svelte

```svelte
<script lang="ts">
  import type { BaseModel } from "pocketbase";
  import { client } from ".";
  import Dialog from "$lib/components/Dialog.svelte";

  const {
    record,
    filename,
    thumbOnly,
  }: {
    record: BaseModel;
    filename: string;
    thumbOnly?: boolean;
  } = $props();
</script>

{#if record && filename}
  {@const src = client.getFileUrl(record, filename, { thumb: "100x100" })}
  <Dialog>
    {#snippet trigger(show)}
      <button onclick={show} type="button" class="thumbnail">
        <img {src} alt="todo" />
      </button>
    {/snippet}
    {#if !thumbOnly}
      {@const src = client.getFileUrl(record, filename)}
      <img {src} alt="todo" />
    {/if}
  </Dialog>
{/if}

<style lang="scss">
  .thumbnail {
    padding: 0;
    > img {
      border-radius: 5px;
      box-shadow: 0 0 5px 0px black;
    }
  }
</style>

```

# sk/src/lib/pocketbase/index.ts

```ts
import PocketBase, { type AuthProviderInfo, RecordService } from "pocketbase";
import type {
  AdminModel,
  AuthModel,
  ListResult,
  RecordListOptions,
  RecordModel,
  UnsubscribeFunc,
} from "pocketbase";
import { readable, type Readable, type Subscriber } from "svelte/store";
import { browser } from "$app/environment";
import { base } from "$app/paths";
import { invalidateAll } from "$app/navigation";

export const client = new PocketBase(
  browser ? window.location.origin + base : undefined
);

export const authModel = readable<AuthModel | AdminModel | null>(
  null,
  function (set, update) {
    client.authStore.onChange((token, model) => {
      update((oldval) => {
        if (
          (oldval?.isValid && !model?.isValid) ||
          (!oldval?.isValid && model?.isValid)
        ) {
          // if the auth changed, invalidate all page load data
          invalidateAll();
        }
        return model;
      });
    }, true);
  }
);

export async function login(
  email: string,
  password: string,
  register = false,
  rest: { [key: string]: any } = {}
) {
  if (register) {
    const user = { ...rest, email, password, confirmPassword: password };
    await client.collection("users").create(user);
  }
  await client.collection("users").authWithPassword(email, password);
}

export function logout() {
  client.authStore.clear();
}

/*
 * Save (create/update) a record (a plain object). Automatically converts to
 * FormData if needed.
 */
export async function save<T>(collection: string, record: any, create = false) {
  // convert obj to FormData in case one of the fields is instanceof FileList
  const data = object2formdata(record);
  if (record.id && !create) {
    // "create" flag overrides update
    return await client.collection(collection).update<T>(record.id, data);
  } else {
    return await client.collection(collection).create<T>(data);
  }
}

// convert obj to FormData in case one of the fields is instanceof FileList
function object2formdata(obj: {}) {
  // check if any field's value is an instanceof FileList
  if (
    !Object.values(obj).some(
      (val) => val instanceof FileList || val instanceof File
    )
  ) {
    // if not, just return the original object
    return obj;
  }
  // otherwise, build FormData (multipart/form-data) from obj
  const fd = new FormData();
  for (const [key, val] of Object.entries(obj)) {
    if (val instanceof FileList) {
      for (const file of val) {
        fd.append(key, file);
      }
    } else if (val instanceof File) {
      // handle File before "object" so that it doesn't get serialized as JSON
      fd.append(key, val);
    } else if (Array.isArray(val)) {
      // for some reason, multipart/form-data wants arrays to be comma-separated strings
      fd.append(key, val.join(","));
    } else if (typeof val === "object") {
      fd.append(key, JSON.stringify(val));
    } else {
      fd.append(key, val as any);
    }
  }
  return fd;
}

export interface PageStore<T = any> extends Readable<ListResult<T>> {
  setPage(newpage: number): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
}

export async function watch<T extends RecordModel>(
  idOrName: string,
  queryParams = {} as RecordListOptions,
  page = 1,
  perPage = 20,
  realtime = browser
): Promise<PageStore<T>> {
  const collection = client.collection(idOrName);
  let result = await collection.getList<T>(page, perPage, queryParams);
  let set: Subscriber<ListResult<T>>;
  let unsubRealtime: UnsubscribeFunc | undefined;
  // fetch first page
  const store = readable<ListResult<T>>(result, (_set) => {
    set = _set;
    // watch for changes (only if you're in the browser)
    if (realtime)
      collection
        .subscribe<T>(
          "*",
          ({ action, record }) => {
            (async function (action: string) {
              // see https://github.com/pocketbase/pocketbase/discussions/505
              switch (action) {
                // ISSUE: no subscribe event when a record is modified and no longer fits the "filter"
                // @see https://github.com/pocketbase/pocketbase/issues/4717
                case "update":
                case "create":
                  // record = await expand(queryParams.expand, record);
                  const index = result.items.findIndex(
                    (r) => r.id === record.id
                  );
                  // replace existing if found, otherwise append
                  if (index >= 0) {
                    result.items[index] = record;
                    return result.items;
                  } else {
                    return [...result.items, record];
                  }
                case "delete":
                  return result.items.filter((item) => item.id !== record.id);
              }
              return result.items;
            })(action).then((items) => set((result = { ...result, items })));
          },
          queryParams
        )
        // remember for later
        .then((unsub) => (unsubRealtime = unsub));
  });
  async function setPage(newpage: number) {
    const { page, totalPages, perPage } = result;
    if (page > 0 && page <= totalPages) {
      set((result = await collection.getList(newpage, perPage, queryParams)));
    }
  }
  return {
    ...store,
    subscribe(run, invalidate) {
      const unsubStore = store.subscribe(run, invalidate);
      return async () => {
        unsubStore();
        // ISSUE: Technically, we should AWAIT here, but that will slow down navigation UX.
        if (unsubRealtime) /* await */ unsubRealtime();
      };
    },
    setPage,
    async next() {
      setPage(result.page + 1);
    },
    async prev() {
      setPage(result.page - 1);
    },
  };
}

export async function providerLogin(
  provider: AuthProviderInfo,
  authCollection: RecordService
) {
  const authResponse = await authCollection.authWithOAuth2({
    provider: provider.name,
    createData: {
      // emailVisibility: true,
    },
  });
  // update user "record" if "meta" has info it doesn't have
  const { meta, record } = authResponse;
  let changes = {} as { [key: string]: any };
  if (!record.name && meta?.name) {
    changes.name = meta.name;
  }
  if (!record.avatar && meta?.avatarUrl) {
    const response = await fetch(meta.avatarUrl);
    if (response.ok) {
      const type = response.headers.get("content-type") ?? "image/jpeg";
      changes.avatar = new File([await response.blob()], "avatar", { type });
    }
  }
  if (Object.keys(changes).length) {
    authResponse.record = await save(authCollection.collectionIdOrName, {
      ...record,
      ...changes,
    });
  }
  return authResponse;
}

```

# sk/src/lib/pocketbase/Paginator.svelte

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { PageStore } from ".";

  const {
    store,
    showIfSinglePage = false,
  }: {
    store: PageStore;
    showIfSinglePage?: boolean;
  } = $props();
</script>

{#if showIfSinglePage || $store.totalPages > 1}
  <div class="paginator">
    <button
      type="button"
      onclick={() => store.prev()}
      disabled={$store.page <= 1}>&laquo;</button
    >
    <div>page {$store.page} of {$store.totalPages}</div>
    <button
      type="button"
      onclick={() => store.next()}
      disabled={$store.page >= $store.totalPages}>&raquo;</button
    >
  </div>
{/if}

<style lang="scss">
  .paginator {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: auto;
  }
</style>

```

# sk/src/lib/pocketbase/ui.ts

```ts
import { alerts } from "$lib/components/Alerts.svelte";

// wrapper to execute a pocketbase client request and generate alerts on failure
export async function alertOnFailure(request: () => void) {
  try {
    await request();
  } catch (e: any) {
    const {
      message,
      data: { data = {} },
    } = e;
    if (message) alerts.error(message);
    for (const key in data) {
      const { message } = data[key];
      if (message) alerts.error(`${key}: ${message}`);
    }
  }
}

```

# sk/src/lib/utils.ts

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

```

# sk/src/routes/+error.svelte

```svelte
<script lang="ts">
  import { page } from "$app/stores";
</script>

<pre>{$page.status} - {$page.error?.message}</pre>

```

# sk/src/routes/+layout.svelte

```svelte
<script lang="ts">
  import "../app.css";
  import "../app.scss";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import Alerts from "$lib/components/Alerts.svelte";
  import LoginBadge from "$lib/components/LoginBadge.svelte";
  import Nav from "$lib/components/Nav.svelte";
  const { data, children } = $props();
  const metadata = $derived(data.metadata ?? {});
  const config = $derived(data.config ?? {});

  $effect(() => {
    if ($page.error) {
      metadata.title = $page.error.message;
    }
  });
</script>

<svelte:head>
  <title>{metadata.title} | {config.site?.name}</title>
</svelte:head>

<header class="container">
  <a href={`${base}/`} class="logo">
    <img src={`${base}/favicon.svg`} alt="application logo" />
  </a>
  <Nav />
  <LoginBadge signupAllowed={config.signupAllowed} />
</header>
<main class="container">
  <Alerts />
  <h1>{metadata.headline ?? metadata.title}</h1>
  {@render children()}
</main>
<footer class="container">
  Copyright &copy; {config.site?.year}
  {config.site?.copyright}
</footer>

<style lang="scss">
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .logo {
      width: 2rem;
      height: 2rem;
    }
  }
  main {
    flex-grow: 1;
  }
</style>

```

# sk/src/routes/+layout.ts

```ts
import type { LayoutLoad } from "./$types";
import { client } from "$lib/pocketbase";
import { alerts } from "$lib/components/Alerts.svelte";

// turn off SSR - we're JAMstack here
export const ssr = false;
// Prerendering turned off. Turn it on if you know what you're doing.
export const prerender = false;
// trailing slashes make relative paths much easier
export const trailingSlash = "always";

export const load: LayoutLoad = async ({ fetch }) => {
  type Metadata = {
    title: string;
    headline?: string;
  };
  let config: {
    site: {
      name: string;
      copyright: string;
      year: number;
    };
    signupAllowed: boolean;
  } = {} as any;
  const title = "Untitled";
  const metadata: Metadata = {
    title,
  };

  try {
    const response = await fetch(client.baseUrl + "/_/");
    if (response.redirected) {
      alerts.add({
        message:
          'Please visit <a href="/_/">/_</a> to finalize installation of PocketBase',
        type: "error",
        html: true,
      });
    }

    config = await client.send("/api/config", { fetch, requestKey: "config" });
  } catch (e: any) {
    alerts.error(e.toString());
  }
  return {
    config,
    metadata,
  };
};

```

# sk/src/routes/+page.svelte

```svelte
<script lang="ts">
  import { base } from "$app/paths";

  const { data } = $props();
  $effect(() => {
    // you could set the metadata either here or in +page.ts
    data.metadata.title = "Home";
    data.metadata.headline = `Welcome to ${data.config.site?.name}`;
  });
</script>

<p>
  Visit
  <a
    href="https://github.com/spinspire/pocketbase-sveltekit-starter"
    target="_blank"
    rel="noopener noreferrer"
  >
    https://github.com/spinspire/pocketbase-sveltekit-starter
  </a>
  on <i class="bx bxl-github bx-sm"></i>GitHub to read the documentation.
</p>

<h2>Features</h2>
<ul>
  <li>Svelte 5: runes, $props, snippets, etc.</li>
  <li>
    SvelteKit: routing, PageData loading, CSR with <code>adapter-static</code>
  </li>
  <li>PocketBase: CRUD, typegen, realtime data updates</li>
  <li>PocketBase: JSVM hook, routes, etc.</li>
</ul>

<p>Now <a href="{base}/posts">browse/edit/create some posts</a>.</p>

```

# sk/src/routes/auditlog/[coll]/[id]/+page.svelte

```svelte
<script lang="ts">
  import type { PageData } from "./$types";
  import Changes from "./Changes.svelte";

  const { data }: { data: PageData } = $props();
  $effect(() => {
    data.metadata.title = data.metadata.headline = "Auditlog";
  });
</script>

<table>
  <thead>
    <tr>
      <th>when</th>
      <th>what</th>
      <th>who</th>
    </tr>
  </thead>
  <tbody>
    {#each data.logs as item}
      <tr>
        <td>{item.updated}</td>
        <td>{item.event}</td>
        <td>{item.admin || item.expand?.user?.name || item.user}</td>
      </tr>
      <tr>
        <td colspan="3"><Changes auditlog={item} /></td>
      </tr>
    {:else}
      <tr>
        <td colspan="3">No records found.</td>
      </tr>
    {/each}
  </tbody>
</table>

```

# sk/src/routes/auditlog/[coll]/[id]/+page.ts

```ts
import { client } from "$lib/pocketbase";
import type {
  AuditlogResponse,
  UsersResponse,
} from "$lib/pocketbase/generated-types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async function ({ params: { coll, id }, fetch }) {
  const logs = await client
    .collection("auditlog")
    .getFullList<AuditlogResponse<unknown, unknown, { user: UsersResponse }>>({
      // TODO: access control
      filter: client.filter("record={:id} && collection={:coll}", { id, coll }),
      expand: "user",
      fetch,
    });
  return {
    logs,
  };
};

```

# sk/src/routes/auditlog/[coll]/[id]/Changes.svelte

```svelte
<script lang="ts">
  import type { AuditlogResponse } from "$lib/pocketbase/generated-types";

  const { auditlog }: { auditlog: AuditlogResponse } = $props();
  const keys = $derived(Object.keys(auditlog.original || {}));
</script>

<table>
  <tbody>
    {#each keys as key}
      <tr>
        <th>{key}</th>
        <td><pre>{auditlog.original[key]}</pre></td>
        <td><pre>{auditlog.data[key]}</pre></td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  pre {
    margin: 0;
    padding: 0;
  }
</style>

```

# sk/src/routes/hello/+page.svelte

```svelte
<script lang="ts">
  import { client } from "$lib/pocketbase/index.js";

  let { data } = $props();
  $effect(() => {
    data.metadata.title = data.metadata.headline = "Hello Page";
  });
  async function sendEmail(e: SubmitEvent) {
    e.preventDefault();
    client.send("/api/sendmail", {
      method: "post",
    });
  }
</script>

<h1>Hello!</h1>
<p>Got the following API response from the backend server</p>
<pre>{JSON.stringify(data, null, 2)}</pre>

<form method="post" onsubmit={sendEmail}>
  <button type="submit">Send me an email</button>
</form>

```

# sk/src/routes/hello/+page.ts

```ts
import { client } from "$lib/pocketbase";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  // client.send instead of "fetch" because it includes auth token
  const hello = await client.send("/api/hello", { fetch });
  return {
    hello,
  };
};

```

# sk/src/routes/posts/[slug]/+layout.svelte

```svelte
<script lang="ts">
  import { base } from "$app/paths";
  import Tabs from "$lib/components/TabGroup.svelte";
  import Tab from "$lib/components/Tab.svelte";
  import type { Snippet } from "svelte";
  import LoginGuard from "$lib/components/LoginGuard.svelte";
  import { preloadData } from "$app/navigation";
  import AuditPage from "../../auditlog/[coll]/[id]/+page.svelte";
  import type { PageData } from "../../auditlog/[coll]/[id]/$types";
  import Delete from "$lib/components/Delete.svelte";
  import { authModel, client } from "$lib/pocketbase";

  const { data, children }: { data: any; children: Snippet } = $props();
  const record = $derived(data.record);
  let active = $state("");
  $effect(() => {
    if (active === "auditlog")
      data.metadata.title =
        data.metadata.headline = `Auditlog: ${record.collectionName}/${record.id}`;
    if (active === "delete")
      data.metadata.title =
        data.metadata.headline = `Delete: ${record.collectionName}/${record.id}`;
  });
</script>

<LoginGuard>
  <Tabs bind:active>
    {#snippet tabs()}
      <a href="{base}/posts/{record.slug || record.id}/">
        <Tab key="view" pathname="/posts/{record.slug || record.id}/">View</Tab>
      </a>
      {#if $authModel?.id === record.user || client.authStore.isAdmin}
        <a href="{base}/posts/{record.id}/edit/">
          <Tab key="edit" pathname="/posts/{record.id}/edit/">Edit</Tab>
        </a>
        <a href="{base}/posts/{record.id}/delete/">
          <Tab key="delete" pathname="/posts/{record.id}/delete/">Delete</Tab>
        </a>
      {/if}
      <a href="{base}/posts/{record.id}/auditlog/">
        <Tab key="auditlog" pathname="{base}/posts/{record.id}/auditlog/">
          Audit Log
        </Tab>
      </a>
    {/snippet}
    <!-- tab content -->
    {#if active === "auditlog"}
      {#await preloadData(`${base}/auditlog/posts/${record.id}/`) then result}
        {#if result.type === "loaded" && result.status === 200}
          <AuditPage data={result.data as PageData} />
        {:else}
          something went wrong!
        {/if}
      {/await}
    {:else if active === "delete"}
      <Delete
        id={record.id}
        table={record.collectionName}
        return_path="../.."
      />
    {:else}
      <!-- default: just render the page we're on -->
      {@render children()}
    {/if}
  </Tabs>
  {#snippet otherwise()}
    <!-- otherwise: just render the page we're on -->
    {@render children()}
  {/snippet}
</LoginGuard>

<style>
  a {
    /* don't color links */
    color: inherit;
  }
</style>

```

# sk/src/routes/posts/[slug]/+layout.ts

```ts
import { client } from "$lib/pocketbase";
import type {
  PostsRecord,
  PostsResponse,
} from "$lib/pocketbase/generated-types";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ params, fetch }) => {
  const { slug } = params;
  // search by both id and slug
  const filter = client.filter("id = {:slug} || slug = {:slug}", { slug });
  const coll = client.collection("posts");
  const options = { fetch };
  let record: PostsRecord = {
    title: "",
    body: "",
    user: "",
    slug: "",
    files: [],
  };
  if (slug !== "new") {
    // load record if existing
    record = await coll.getFirstListItem<PostsResponse>(filter, options);
  }
  return {
    record: record as PostsResponse,
  };
};

```

# sk/src/routes/posts/[slug]/+page.svelte

```svelte
<script lang="ts">
  import ImgModal from "$lib/pocketbase/ImgModal.svelte";
  import { client } from "$lib/pocketbase/index.js";

  const { data } = $props();
  const record = $derived(data.record);
  $effect(() => {
    data.metadata.title = data.metadata.headline = record.title;
  });
</script>

<article>
  <pre class="body">{record.body}</pre>
  {#each record.files ?? [] as file, index}
    {@const src = client.files.getUrl(record, file)}
    {@const title = `image ${index + 1} for: ${record.title}`}
    <!-- <img {src} alt={title} {title} /> -->
    <ImgModal {record} filename={file} />
  {/each}
</article>

```

# sk/src/routes/posts/[slug]/edit/+page.svelte

```svelte
<script lang="ts">
  import { alerts } from "$lib/components/Alerts.svelte";
  import FileInput from "$lib/components/FileInput.svelte";
  import Spinner, { activityStore } from "$lib/components/Spinner.svelte";
  import { authModel, client, save } from "$lib/pocketbase";
  import FileField from "$lib/pocketbase/FileField.svelte";
  import type { PostsResponse } from "$lib/pocketbase/generated-types.js";
  import z from "zod";

  const { data } = $props();
  let record = $state(data.record);
  let fileInput = $state() as HTMLInputElement;
  let toBeRemoved = $state([]);
  $effect(() => {
    data.metadata.title = data.metadata.headline = `Edit Post: ${record.title}`;
  });

  const schema = z.object({
    id: z.string().optional().describe("ID"),
    title: z.string().trim().min(1, "value required.").describe("Title"),
    slug: z
      .string()
      .trim()
      .min(1, "required.")
      .refine((s: string) => !s.startsWith("/"), "must not start with a slash.")
      .describe("Slug"),
    body: z.string().trim().min(1, "required.").describe("Body"),
  });

  async function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    const { success, error, data } = schema.safeParse(record);
    if (success) {
      const files = fileInput?.files;
      const user = client.authStore.isAdmin ? "" : $authModel?.id;
      record = await save<PostsResponse>("posts", {
        ...data,
        files,
        user,
        "files-": toBeRemoved,
      });
      alerts.info("Post saved.", 5000);
      history.back();
    } else {
      Object.entries(error.flatten().fieldErrors).forEach(([k, v]) =>
        alerts.error(`${k}: ${v}`)
      );
    }
  }
  const store = activityStore<SubmitEvent>((e) => onsubmit(e));
</script>

<form onsubmit={store.run}>
  <output>ID: {record.id ?? "-"}</output>
  <div class="flex h">
    <div data-label="title">
      <input type="text" bind:value={record.title} />
    </div>
    <div data-label="slug">
      <input type="text" bind:value={record.slug} />
    </div>
    <div data-label="files">
      <FileInput bind:fileInput pasteFile={true} multiple={true} />
    </div>
  </div>
  <FileField {record} fieldName="files" bind:toBeRemoved />
  <div data-label="body">
    <textarea bind:value={record.body} placeholder="body"></textarea>
  </div>
  <button type="submit">
    <Spinner active={$store} />
    Save
  </button>
</form>

```

# sk/src/routes/posts/+page.svelte

```svelte
<script lang="ts">
  import { base } from "$app/paths";
  import DateShow from "$lib/components/DateShow.svelte";
  import Image from "$lib/pocketbase/Image.svelte";
  import Link2Modal from "$lib/components/Link2Modal.svelte";
  import { client } from "$lib/pocketbase";
  import EditPage from "./[slug]/edit/+page.svelte";
  import LoginGuard from "$lib/components/LoginGuard.svelte";
  import Paginator from "$lib/pocketbase/Paginator.svelte";
  import Spinner, { activityStore } from "$lib/components/Spinner.svelte";

  const { data } = $props();
  const posts = $derived(data.posts);
  $effect(() => {
    data.metadata.title = data.metadata.headline = "Posts";
  });
  const store = activityStore(() =>
    client.send("/api/generate", { method: "post" })
  );
</script>

<LoginGuard>
  <Link2Modal component={EditPage}>
    {#snippet trigger(onclick)}
      <a href="{base}/posts/new/edit" class="button" {onclick}>
        New Post
        <i class="bx bx-tada bx-list-plus"></i>
      </a>
    {/snippet}
  </Link2Modal>
  <button type="button" onclick={store.run} disabled={$store}
    ><Spinner active={$store} />
    Generate a random post
  </button>
  {#snippet otherwise()}
    <p>Please Sign In to create/edit posts.</p>
  {/snippet}
</LoginGuard>

<Paginator store={posts} showIfSinglePage={true} />
{#each $posts.items as item}
  {@const [file] = item.files}
  {@const thumbnail = client.files.getUrl(item, file, { thumb: "100x100" })}
  <a href={`${base}/posts/${item.slug || item.id}`} class="post">
    <DateShow date={item.updated} />
    <Image record={item} {file} />
    <div>
      <div>
        <i class="bx bx-calendar" title="on date"></i>
        {new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(
          new Date(item.updated)
        )}
        {#if item.expand?.user?.name}
          <i class="bx bx-pen" title="author"></i>
          {item.expand.user.name}
        {/if}
      </div>
      <h2>{item.title}</h2>
    </div>
  </a>
{:else}
  <div>No posts found. Create some.</div>
{/each}
<Paginator store={posts} showIfSinglePage={true} />

<style lang="scss">
  .post {
    color: inherit;
    display: flex;
    gap: 1rem;
    padding-block: 1rem;
    & + .post {
      border-block-start: dashed 1px;
    }
  }
</style>

```

# sk/src/routes/posts/+page.ts

```ts
import { client, watch } from "$lib/pocketbase";
import type { PostsResponse } from "$lib/pocketbase/generated-types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent, fetch }) => {
  const filter = client.filter("user != ''", {});
  const expand = "user";
  const queryParams = {
    // filter,
    expand,
    fetch,
  };
  const posts = await watch<PostsResponse<any>>("posts", queryParams);
  const { metadata } = await parent();
  // you could set the title/headline either here or in +page.svelte
  metadata.title = "Posts";
  return {
    metadata,
    posts,
  };
};

```

# sk/static/favicon.ico

This is a binary file of the type: Binary

# sk/svelte.config.js

```js
import adapter from "@sveltejs/adapter-static";
import preprocess from "svelte-preprocess";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    alias: {
      $lib: "src/lib",
    },
    adapter: adapter({
      // Prerendering turned off. Turn it on if you know what you're doing.
      prerender: { entries: [] },
      fallback: "index.html", // enable SPA mode
    }),
  },
};

export default config;

```

# sk/tailwind.config.ts

```ts
import { fontFamily } from "tailwindcss/defaultTheme";
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
	darkMode: ["class"],
	content: ["./src/**/*.{html,js,svelte,ts}"],
	safelist: ["dark"],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px"
			}
		},
		extend: {
			colors: {
				border: "hsl(var(--border) / <alpha-value>)",
				input: "hsl(var(--input) / <alpha-value>)",
				ring: "hsl(var(--ring) / <alpha-value>)",
				background: "hsl(var(--background) / <alpha-value>)",
				foreground: "hsl(var(--foreground) / <alpha-value>)",
				primary: {
					DEFAULT: "hsl(var(--primary) / <alpha-value>)",
					foreground: "hsl(var(--primary-foreground) / <alpha-value>)"
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
					foreground: "hsl(var(--secondary-foreground) / <alpha-value>)"
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
					foreground: "hsl(var(--destructive-foreground) / <alpha-value>)"
				},
				muted: {
					DEFAULT: "hsl(var(--muted) / <alpha-value>)",
					foreground: "hsl(var(--muted-foreground) / <alpha-value>)"
				},
				accent: {
					DEFAULT: "hsl(var(--accent) / <alpha-value>)",
					foreground: "hsl(var(--accent-foreground) / <alpha-value>)"
				},
				popover: {
					DEFAULT: "hsl(var(--popover) / <alpha-value>)",
					foreground: "hsl(var(--popover-foreground) / <alpha-value>)"
				},
				card: {
					DEFAULT: "hsl(var(--card) / <alpha-value>)",
					foreground: "hsl(var(--card-foreground) / <alpha-value>)"
				},
				sidebar: {
					DEFAULT: "hsl(var(--sidebar-background))",
					foreground: "hsl(var(--sidebar-foreground))",
					primary: "hsl(var(--sidebar-primary))",
					"primary-foreground": "hsl(var(--sidebar-primary-foreground))",
					accent: "hsl(var(--sidebar-accent))",
					"accent-foreground": "hsl(var(--sidebar-accent-foreground))",
					border: "hsl(var(--sidebar-border))",
					ring: "hsl(var(--sidebar-ring))",
        		},
			},
			borderRadius: {
				xl: "calc(var(--radius) + 4px)",
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)"
			},
			fontFamily: {
				sans: [...fontFamily.sans]
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--bits-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--bits-accordion-content-height)" },
					to: { height: "0" },
				},
				"caret-blink": {
					"0%,70%,100%": { opacity: "1" },
					"20%,50%": { opacity: "0" },
				},
			},
			animation: {
        		"accordion-down": "accordion-down 0.2s ease-out",
        		"accordion-up": "accordion-up 0.2s ease-out",
       			"caret-blink": "caret-blink 1.25s ease-out infinite",
      		},
		},
	},
	plugins: [tailwindcssAnimate],
};

export default config;

```

# sk/tests/smoke.test.ts

```ts
import { test, expect, type Page } from "@playwright/test";
import playwright from "playwright";

const ts = Date.now();
const email = ts + "@test.com";
const password = "0123456789";

async function doLogin(page: Page) {
  await page.locator("summary").click();
  await page.getByPlaceholder("email").fill(email);
  await page.getByPlaceholder("password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  const logout = await page.getByRole("button", { name: "Logout" });
  expect(logout).toBeDefined();
  const name = await page.locator("button>samp").innerText();
  expect(name, email);
}

test("posts logged out", async ({ page }) => {
  await page.goto("/posts");
  const heading = await page.getByRole("heading", { name: "Recent Posts" });
  expect(heading).toBeDefined();
  const p = await page.getByText("Please login to create new posts.");
  expect(p).toBeDefined();
});

test("register", async ({ page }) => {
  await page.goto("/posts");
  await page.locator("summary").click();
  await page.getByPlaceholder("email").fill(email);
  await page.getByPlaceholder("password").fill(password);
  await page.getByLabel("Register").check();
  await page.getByPlaceholder("confirm password").fill("0123456789");
  await page.getByRole("button", { name: "Login" }).click();
  const name = await page.locator("button>samp").innerText();
  expect(name, email);
});

test("login", async ({ page }) => {
  await page.goto("/posts");
  await doLogin(page);
  const name = await page.locator("button>samp").innerText();
  expect(name, email);
});

test("posts logged in", async ({ page }) => {
  await page.goto("/posts");
  await doLogin(page);
  const heading = await page.getByRole("heading", { name: "Recent Posts" });
  expect(heading).toBeDefined();
  const link = await page.getByRole("link", { name: "Create New" });
  expect(link).toBeDefined();
});

const title = "post at " + ts;
const slug = "post-" + ts;

test("create post", async ({ page }) => {
  // second browser to test realtime subscriptions
  const b2 = (await (await playwright.chromium.launch()).newPage()) as Page;
  await b2.goto("/posts");
  await doLogin(b2);

  await page.goto("/posts");
  await doLogin(page);
  await page.getByRole("link", { name: "Create New" }).click();
  await page.getByPlaceholder("title").click();
  const ts = Date.now();
  await page.getByPlaceholder("title").fill(title);
  await page.getByPlaceholder("slug").fill(slug);
  await page.getByPlaceholder("body").fill("line 1\nline 2");
  // await page.locator('input[type="file"]').setInputFiles("posts-1.png");
  await page.locator('input[type="file"]').setInputFiles("README.md");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page).toHaveURL(/\/posts\/$/);
  await page.getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/posts\/.+\/$/);
  const heading = await page.getByRole("heading", { name: title });
  expect(heading).toBeDefined();
  // check realtime activity in the second browser
  const link = await b2.getByRole("link", { name: title });
  expect(link).toBeDefined();
});

test("delete post", async ({ page }) => {
  await page.goto(`/posts/${slug}/#delete`);
  await doLogin(page);
  await page.getByRole("button", { name: "No - Cancel" }).click();
  await expect(page).toHaveURL(/\/posts\/$/);
  await page.goto(`/posts/${slug}/#delete`);
  await page.getByRole("button", { name: "Yes - Proceed" }).click();
  await expect(page).toHaveURL(/\/posts\/$/);
});

```

# sk/tsconfig.json

```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true
	}
	// Path aliases are handled by https://kit.svelte.dev/docs/configuration#alias
	//
	// If you want to overwrite includes/excludes, make sure to copy over the relevant includes/excludes
	// from the referenced tsconfig.json - TypeScript does not merge them in
}

```

# sk/vite.config.ts

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import type { UserConfig } from "vite";
import fs from "fs";

// detect if we're running inside docker and set the backend accordingly
const pocketbase_url = fs.existsSync("/.dockerenv")
  ? "http://pb:8090" // docker-to-docker
  : "http://127.0.0.1:8090"; // localhost-to-localhost

const config: UserConfig = {
  plugins: [sveltekit()],
  server: {
    proxy: {
      // proxy "/api" and "/_" to pocketbase_url
      "/api": pocketbase_url,
      "/_": pocketbase_url,
    },
  },
};

export default config;

```

