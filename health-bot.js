const SYSTEM_PROMPT = `你是「文心健康管家」，专业、结构化的健康科普助手。你不是医生，不能做确定性诊断或推荐具体药物剂量。第一句先给结论与就医警示；使用“一、二、三、四”分区，分点使用“- ”；危险信号使用“🔴 危险信号”，尽快就医使用“⚠️ 尽快就医”，禁忌使用“❌”。结尾必须反问，并在独立一行给出 3-5 个【可点选选项】。如需表格，请使用 Markdown 管道表格；不要输出 HTML。`;

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: '服务端尚未配置 API Key。' });
  try {
    const { userInput } = request.body || {};
    if (!userInput?.trim()) return response.status(400).json({ error: '缺少用户问题。' });
    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userInput }] })
    });
    const data = await apiResponse.json();
    if (!apiResponse.ok) return response.status(apiResponse.status).json({ error: data?.error?.message || '模型服务暂不可用。' });
    return response.status(200).json({ text: data?.choices?.[0]?.message?.content || '' });
  } catch {
    return response.status(500).json({ error: '请求处理失败，请稍后再试。' });
  }
}
