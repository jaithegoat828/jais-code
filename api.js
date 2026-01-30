export async function getBookInfo(prompt) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return "Missing API key. Create a .env file and set VITE_OPENAI_API_KEY.";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Give me a simple explanation about: ${prompt}`,
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      return "OpenAI API error. Check repo secrets and rate limits.";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response.";
  } catch (err) {
    console.error(err);
    return "Network error contacting OpenAI API.";
  }
}
