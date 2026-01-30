export async function getBookInfo(prompt) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

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

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response.";
}
