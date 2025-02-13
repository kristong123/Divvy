const corsOptions = {
    origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://divvy-chi.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
};

module.exports = corsOptions; 