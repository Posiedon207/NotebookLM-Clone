# NotebookLM Clone (RAG Pipeline)

A full RAG-powered application inspired by Google NotebookLM. This application allows users to upload PDF or Plain Text documents and have a conversation with them, getting answers grounded strictly in the document's content.

## Features
- **Modern UI**: A premium, visually stunning interface with glassmorphism, responsive design, and smooth animations using React and Framer Motion.
- **Support for PDF & TXT**: Upload documents in multiple formats as per assignment requirements.
- **Full RAG Pipeline**: Ingestion -> Chunking -> Embedding -> Storage -> Retrieval -> Generation.
- **Gemini Powered**: Uses Google's `gemini-1.5-pro` for generation and `text-embedding-004` for vector embeddings.
- **Zero Configuration Deployment**: Uses an in-memory vector database, making it extremely easy to run and test without configuring external services like Qdrant or Pinecone.

## Tech Stack
- **Frontend**: React (Vite), Vanilla CSS, Framer Motion, Lucide Icons, Axios.
- **Backend**: Node.js, Express, Multer.
- **AI/LLM**: LangChain, `@langchain/google-genai`.
- **Vector Store**: `MemoryVectorStore` (Langchain).

## RAG Pipeline Implementation Details

### 1. Ingestion
The user uploads a PDF or TXT document via the drag-and-drop React frontend. The file is sent to the Node.js Express server using `multer`. 
- **PDFs** are parsed using Langchain's `PDFLoader`.
- **Text files** are parsed using Langchain's `TextLoader`.

### 2. Chunking Strategy
We use Langchain's **`RecursiveCharacterTextSplitter`**. 
- **Documentation**: This strategy tries to split on the most natural structural boundaries of text (like paragraphs `\n\n`, then lines `\n`, then sentences). This ensures that semantically related text is kept together rather than being cut arbitrarily in the middle of a word or sentence.
- **Parameters Used**:
  - `chunkSize: 1000`: Each chunk holds up to 1000 characters to provide sufficient context to the LLM.
  - `chunkOverlap: 200`: A 200-character overlap prevents cutting off important cross-sentence context, ensuring continuity between adjacent chunks.

### 3. Embedding
Chunks are embedded into high-dimensional vectors using Google's **`text-embedding-004`** model via `@langchain/google-genai`.

### 4. Storage (Vector Database)
To ensure the project runs seamlessly locally and can be deployed without complex local setups (like Docker for Qdrant), we utilize Langchain's **`MemoryVectorStore`**. It securely holds the embeddings in the server's memory for the duration of the session and acts as our Vector Database, satisfying the storage and querying requirements seamlessly.

### 5. Retrieval
When a user asks a question, the query is embedded using the same Gemini embedding model. We then perform a similarity search against our `MemoryVectorStore` to retrieve the `k=4` most relevant chunks.

### 6. Generation
The retrieved chunks are injected as context into a strict `PromptTemplate`. The LLM (`gemini-1.5-pro`) is explicitly instructed to **only answer based on the provided context**. If the answer isn't in the document, the model is instructed to refuse to hallucinate.

## How to Run Locally

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key

### Setup
1. Open terminal in the root directory.
2. Run `npm install` to install backend dependencies.
3. Create a `.env` file in the root directory and add your Gemini API Key:
   ```env
   GOOGLE_API_KEY="your_gemini_api_key_here"
   PORT=3001
   ```
4. Build the frontend:
   ```bash
   npm run build
   ```
5. Start the application:
   ```bash
   npm start
   ```
6. Open `http://localhost:3001` in your browser.

## Deployment Notes
Since this project uses an in-memory vector store and the server is configured to serve the frontend build as static assets, it can be deployed to any basic Node.js hosting provider (like Render, Heroku, or Railway) with a single click by pushing this repository to GitHub. 
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
