import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { PromptTemplate } from "@langchain/core/prompts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app build
const frontendDistPath = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: "uploads/" });

// In-memory vector store instance
let vectorStore = null;

// Configure embedding and chat model
const getEmbeddings = () => {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: "text-embedding-004",
  });
};

const getChatModel = () => {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: "gemini-1.5-pro",
    temperature: 0,
  });
};

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    console.log(`Processing file: ${req.file.originalname} (${fileExtension})`);

    // 1. Ingestion: Load PDF or Text
    let docs = [];
    if (fileExtension === ".pdf") {
      const loader = new PDFLoader(filePath);
      docs = await loader.load();
    } else if (fileExtension === ".txt") {
      // Manual text loading to avoid package export issues
      const text = fs.readFileSync(filePath, "utf-8");
      docs = [new Document({ 
        pageContent: text, 
        metadata: { source: req.file.originalname } 
      })];
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Unsupported file type. Please upload PDF or TXT." });
    }

    // 2. Chunking: Split text into manageable pieces
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} chunks.`);

    // 3. Embedding & Storage: Create vector store
    vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, getEmbeddings());

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Document processed and indexed successfully!", chunks: splitDocs.length });
  } catch (error) {
    console.error("Error processing document:", error);
    res.status(500).json({ error: "Failed to process document" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    if (!vectorStore) {
      return res.status(400).json({ error: "Please upload a document first." });
    }

    // 4. Retrieval: Get relevant chunks
    const retriever = vectorStore.asRetriever({ k: 4 });
    const relevantDocs = await retriever.invoke(query);

    const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

    // 5. Generation: Grounded answer from LLM
    const llm = getChatModel();
    const prompt = PromptTemplate.fromTemplate(`
You are an AI Assistant who helps resolve the user query based ONLY on the available context provided from the uploaded document.

Rule:
- Only answer based on the available context below. If the answer is not in the context, explicitly say "I cannot answer this based on the provided document." Do not hallucinate or use external knowledge.

Context:
{context}

User Query: {query}
Answer:`);

    const formattedPrompt = await prompt.format({
      context: context,
      query: query,
    });

    const response = await llm.invoke(formattedPrompt);

    res.json({ answer: response.content, sources: relevantDocs });
  } catch (error) {
    console.error("Error during chat:", error);
    res.status(500).json({ error: "Failed to generate answer" });
  }
});

// For any other request, serve index.html from the build folder
app.get("*", (req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend build not found. Please run 'npm run build' in the frontend directory.");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
