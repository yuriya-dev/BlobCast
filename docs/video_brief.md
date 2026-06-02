# Video Brief: BlobCast Product Demo

**Duration:** Max 3 Minutes (180 Seconds)  
**Target Audience:** Hackathon Judges, Investors, and Web3 Developers  
**Language:** English  

---

## 🎬 Video Structure & Storyboard

### Part 1: The Problem (0:00 - 0:45)
* **Visual:** Close-up of speaker or a clean split-screen showing news headlines about social media censorship, account bans, and platform shut downs. An animated icon of a database server locking up or vanishing.
* **Audio/Speech:** 
  > *"Have you ever thought about who actually owns your digital footprint? Every day, millions of creators publish thoughts, images, and videos on centralized social networks. But the reality is: you don’t own any of it. Centralized platforms can censor your posts, delete your account, or shut down entirely—wiping away years of your social capital overnight. Web3 promised a solution, but storing rich media directly on-chain is prohibitively expensive, and existing decentralized storage networks can be slow and disconnected from the user experience. Content creators are stuck in a cycle of rented platforms and vulnerable ownership."*

---

### Part 2: The Solution (0:45 - 1:20)
* **Visual:** Smooth transition to the BlobCast web interface. Show a sleek landing page with the tagline *"Own your posts forever."* Walk through a user profile page.
* **Audio/Speech:**
  > *"Introducing **BlobCast**, a decentralized social publishing protocol built to ensure you own your content forever. BlobCast combines the speed of modern web applications with the absolute permanence of Web3. By leveraging a hybrid architecture, we separate heavy data from lightweight ownership. Your text, high-res images, and video files are stored permanently and uncensorably, while your ownership is secured cryptographically. If a post is flagged by AI moderation, the frontend hides it, but the data itself remains immutable on the decentralized web. You control your content, your identity, and your monetization."*

---

### Part 3: Technology Stack (1:20 - 2:00)
* **Visual:** Display the System Architecture diagram (or a stylized motion graphic of it). Highlight the logos of Sui, Walrus, Tatum, Next.js, and Supabase as they are mentioned.
* **Audio/Speech:**
  > *"To build this production-grade application, we engineered a state-of-the-art tech stack. 
  > At the storage layer, we use **Walrus Protocol**, encoding content with Reed-Solomon erasure coding for permanent, cost-efficient storage. 
  > At the consensus layer, **Sui Blockchain** handles ownership verification, tipping, and user identity through Move smart contracts. 
  > To bridge the blockchain with our servers reliably, we integrated **Tatum's enterprise-grade RPC infrastructure**, ensuring high availability, lower latency, and seamless failover to public gateways. 
  > For the application layer, **Next.js 16** powers our reactive client, while an **Express API gateway** handles caching with **Redis** and indexing with **Prisma and Supabase (PostgreSQL)**, providing a sub-second feed response time."*

---

### Part 4: Proof of Product & Live Demo (2:00 - 2:50)
* **Visual:** Screen recording of the actual application in action.
  1. Click 'Connect Wallet' and sign a message using Sui Wallet (passwordless login).
  2. Create a new post, attach an image, and click "Publish".
  3. Show the console log or a floating tooltip displaying:
     * *Walrus Blob ID upload success.*
     * *Sui Transaction hash generated.*
     * *Indexer daemon syncing event in real-time.*
  4. Perform a real-time tip: click the "Tip" button on a post, send 0.5 SUI to the creator, and show the transaction success state.
* **Audio/Speech:**
  > *"Let's look at how it works in real-time. First, we log in using a Sui wallet—no passwords, just cryptographic signatures. Now, I'll create a post with an image. When I hit publish, the image and post JSON are uploaded directly to Walrus, returning a permanent Blob ID. Simultaneously, a Sui smart contract registers the authorship. Instantly, our indexer daemon, listening via Tatum RPC, catches the event, updates the PostgreSQL database, and pushes the post to our global Redis feed. We can also reward creators directly—tipping SUI with instant finality directly through our tipping contract."*

---

### Part 5: Conclusion & Outro (2:50 - 3:00)
* **Visual:** The speaker returns to screen or a final call-to-action slide showing the GitHub repository and live website URL. 
* **Audio/Speech:**
  > *"BlobCast isn't just another social network; it is a permanent archive of human expression. Join the publishing revolution today at blobcast.xyz and own your posts forever. Thank you!"*

---

## 💡 Production Tips for Recording
1. **Pacing:** Keep your speech rate moderate (around 130-150 words per minute) to ensure clarity. 
2. **Audio:** Use a dedicated microphone; clear audio is critical for hackathon submissions.
3. **Editing:** Use zoom-ins on the screen recording when showing Walrus Blob IDs or Sui Transactions so the text is legible to viewers.
