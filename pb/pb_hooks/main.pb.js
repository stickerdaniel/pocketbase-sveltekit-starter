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

    // Call Gemini API with structured output prompt
    try {
      console.log("[DEBUG] Preparing Gemini API call");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      // Request structured output using JSON schema specification in the prompt
      const prompt = `${randomTopic}
      Do not repeat the topic/title in the body of the blog post.
      Please use markdown formatting for the body of the blog post. If suitable, you can include short code snippets or examples.
      Make sure the title is engaging, the body is comprehensive and well-structured with paragraphs. When talking about package managers, default to bun. When talking about frameworks, default to Svelte 5. When talking about databases, default to PocketBase. When talking about UI, default to next.shadcn-svelte components.`;

      // Define the response schema using Gemini's schema format
      const schema = {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "Concise, catchy title for the blog post"
          },
          "body": {
            "type": "string",
            "description": "Full blog post content with proper formatting and paragraphs"
          },
        },
        "required": ["title", "body"],
        "propertyOrdering": ["title", "body"]
      };

      const payload = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: schema
        }
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

      console.log("[DEBUG] Successfully received Gemini API response");

      // Extract the JSON content from the response
      let generatedContent;
      try {
        const contentText = responseData.candidates[0].content.parts[0].text;
        // Parse the JSON content - this should be properly formatted due to our schema
        generatedContent = JSON.parse(contentText);
        console.log("[DEBUG] Successfully parsed JSON content");
      } catch (parseError) {
        console.log("[ERROR] Failed to parse JSON content:", parseError);
        console.log("[DEBUG] Raw content:", responseData.candidates[0].content.parts[0].text);

        // Fallback: Try to extract content even if not perfect JSON
        const rawText = responseData.candidates[0].content.parts[0].text;

        // Handle case where JSON might be wrapped in markdown code blocks
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
          rawText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          try {
            generatedContent = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            console.log("[DEBUG] Extracted JSON from code block");
          } catch (e) {
            console.log("[ERROR] Failed to parse extracted JSON:", e);
            // Fall back to default structure with raw content
            generatedContent = {
              title: "Generated Blog Post",
              body: rawText,
            };
          }
        } else {
          // Complete fallback if we can't extract JSON
          const firstSentenceMatch = rawText.match(/^([^.!?]+[.!?])\s*/);
          const title = firstSentenceMatch ? firstSentenceMatch[1].trim() : "Generated Post";
          const body = firstSentenceMatch ?
            rawText.substring(firstSentenceMatch[0].length).trim() :
            rawText;

          generatedContent = {
            title: title,
            body: body,
          };
        }
      }

      console.log("[DEBUG] Generated title:", generatedContent.title);

      // Generate a slug from the title
      const slug = generatedContent.title
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

      const record = new Record(coll, {
        title: generatedContent.title,
        body: generatedContent.body,
        slug: slug,
        user: user?.id
      });
      const form = new RecordUpsertForm($app, record);

      // Add random number of images (0-4) from picsum.photos
      console.log("[DEBUG] Preparing images for post");
      try {
        // Generate a random number of images between 0 and 4
        const numImages = Math.floor(Math.random() * 5); // 0-4 images
        console.log(`[DEBUG] Adding ${numImages} random images to the post`);

        if (numImages > 0) {
          // Create array to hold image files
          const imageFiles = [];

          // Generate the specified number of images with different seeds
          for (let i = 0; i < numImages; i++) {
            // Use different sizes and random seeds for variety
            const width = 1000 + Math.floor(Math.random() * 300); // 1000-1299px width
            const height = 600 + Math.floor(Math.random() * 200); // 600-799px height
            const seed = Math.floor(Math.random() * 1000);

            // Add image to array
            imageFiles.push(
              $filesystem.fileFromUrl(`https://picsum.photos/seed/${seed}/${width}/${height}`)
            );
          }

          // Add all files at once
          form.addFiles("files", ...imageFiles);
          console.log("[DEBUG] Images added successfully");
        } else {
          console.log("[DEBUG] No images added to this post");
        }
      } catch (imgError) {
        console.log("[ERROR] Error adding images:", imgError);
        // Continue anyway, images are not critical
      }

      console.log("[DEBUG] Submitting record");
      form.submit();
      console.log("[DEBUG] Record created successfully");

      // Return structured data with post information and the original generated content
      return c.json(200, {
        record: {
          id: record.id,
          title: record.get("title"),
          body: record.get("body"),
          slug: record.get("slug"),
          imageCount: record.get("files")?.length || 0
        },
        message: "Post generated successfully with Gemini API"
      });
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
