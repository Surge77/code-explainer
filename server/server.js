import "dotenv/config"
import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import OpenAI from 'openai';

const app = express()

//Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15 minutes in ms
  max: 100,                        // allow 100 requests per window per client
  message: "TOO many requests from the IP, please try again later"
})
app.use(limiter)

app.use(express.json({ limit: "10mb"})); //10mb is the maximum size of the json body

const API_KEY = process.env.NEBIUS_API_KEY

const client = new OpenAI({
    baseURL: 'https://api.studio.nebius.com/v1/',
    apiKey: API_KEY,
});

app.post("/api/explain-code",async (req,res) => {
  try {
    const {code, language} = req.body;

    if(!code){
      return res.status(400).json({error: "code is required"})
    }

    const messages = [
      {
        role: "user",
        content: `Please explain this ${language} || ""  code in simple terms:\n\n\`\`\`${language || ""}\n${code}\n\`\`\``,
      } 
    ];

    const response = await client.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages,
    temperature: 0.3,
    max_tokens: 800,
  });


  // /?. means: “Try to access this property only if the left side exists; otherwise, stop and return undefined instead of crashing.”
  const explanation = response?.choices[0]?.message?.content; //optional chaining 
    if (!explanation) {
      return res.status(500).json({ error: "Failed to explain code" });
    }

    res.json({ explanation, language: language || "unknown" });

  } catch (error) {
    console.log("code explain API error", error);
    res.status(500).json({error:"server error", details:error.message}); 
    
    
  }
  
})


const PORT = process.env.PORT || 3002;

app.listen(PORT,() => {
  console.log(`API server listening on http://localhost:${PORT}`);
  
})