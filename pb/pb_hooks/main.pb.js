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
    console.log("[DEBUG] Starting random post generation");

    // Get Gemini API key from PocketBase environment
    const apiKey = $os.getenv("GEMINI_API_KEY");

    console.log("[DEBUG] GEMINI_API_KEY available:", !!apiKey);
    if (!apiKey) {
      console.log("[ERROR] GEMINI_API_KEY not configured in environment");
      return c.json(500, { error: "GEMINI_API_KEY not configured in environment" });
    }

    // Generate random content topic - alternate between Svelte 5 and PocketBase
    const topics = [
      "Write a blog post about new features in Svelte 5 that developers will love",
      "Explain the top 5 PocketBase features that make it great for rapid development",
      "Write a tutorial on how to use Svelte 5's runes with PocketBase",
      "Create a blog post about PocketBase hooks and when to use them",
      "Write about Svelte 5's performance improvements compared to previous versions",
      "Explain how to implement real-time features with PocketBase and Svelte",
      "Create a post about authentication best practices with PocketBase"
    ];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    console.log("[DEBUG] Selected topic:", randomTopic);

    // Call Gemini API
    try {
      console.log("[DEBUG] Preparing Gemini API call");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{
          parts: [{ text: randomTopic }]
        }]
      };

      console.log("[DEBUG] Sending request to Gemini API");
      const response = $http.send({
        url,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log("[DEBUG] Gemini API response status:", response.statusCode);

      if (response.statusCode !== 200) {
        console.log("[ERROR] Gemini API error response:", response.raw);
        return c.json(response.statusCode, {
          error: "Failed to generate content with Gemini API",
          details: response.raw
        });
      }

      console.log("[DEBUG] Parsing Gemini API response");
      const responseData = JSON.parse(response.raw);

      if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
        console.log("[ERROR] Unexpected Gemini API response format:", JSON.stringify(responseData));
        return c.json(500, {
          error: "Unexpected Gemini API response format",
          details: JSON.stringify(responseData)
        });
      }

      const generatedText = responseData.candidates[0].content.parts[0].text;
      console.log("[DEBUG] Generated text (first 100 chars):", generatedText.substring(0, 100) + "...");

      // Extract title from first sentence
      const firstSentenceMatch = generatedText.match(/^([^.!?]+[.!?])\s*/);
      const title = firstSentenceMatch ? firstSentenceMatch[1].trim() : "Generated Post";
      console.log("[DEBUG] Extracted title:", title);

      // Remove the title from the body if it was extracted
      let body = generatedText;
      if (firstSentenceMatch) {
        body = generatedText.substring(firstSentenceMatch[0].length).trim();
      }

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);
      console.log("[DEBUG] Generated slug:", slug);

      // Create post record
      console.log("[DEBUG] Creating post record");
      const coll = $app.dao().findCollectionByNameOrId("posts");
      /** @type {models.Record} */
      const user = c.get("authRecord");
      console.log("[DEBUG] User authenticated:", !!user);

      const record = new Record(coll, { title, body, slug, user: user?.id });
      const form = new RecordUpsertForm($app, record);

      // Still using picsum.photos for random images
      console.log("[DEBUG] Fetching images from picsum.photos");
      try {
        form.addFiles(
          "files",
          $filesystem.fileFromUrl("https://picsum.photos/500/300"),
          $filesystem.fileFromUrl("https://picsum.photos/500/300")
        );
        console.log("[DEBUG] Images added successfully");
      } catch (imgError) {
        console.log("[ERROR] Error adding images:", imgError);
        // Continue anyway, images are not critical
      }

      console.log("[DEBUG] Submitting record");
      form.submit();
      console.log("[DEBUG] Record created successfully");

      c.json(200, record);
    } catch (err) {
      console.error("[ERROR] Error generating post:", err);
      return c.json(500, {
        error: "Failed to generate post",
        details: err.message,
        stack: err.stack
      });
    }
  },
  $apis.requireAdminOrRecordAuth()
);
