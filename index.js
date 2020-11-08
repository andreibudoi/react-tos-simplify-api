const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const pdf = require("pdf-parse");
const app = express();

let natural = require("natural");
natural.PorterStemmer.attach();

const agreements = [
    {
        topic: "This service may collect, use, and share location data",
        tokens: [
            { word: "collect", tag: "VB" },
            { word: "locat", tag: "N" },
            { word: "us", tag: "VB" },
            { word: "data", tag: "N" },
            { word: "share", tag: "VB" },
        ],
    },
    {
        topic:
            "You agree to defend, indemnify, and hold the service harmless in case of a claim related to your use of the service",
        tokens: [
            { word: "agre", tag: "VB" },
            { word: "defend", tag: "VB" },
            { word: "indemnifi", tag: "VB" },
            { word: "hold", tag: "VB" },
            { word: "harmless", tag: "ADJ" },
            { word: "case", tag: "N" },
            { word: "claim", tag: "N" },
            { word: "relat", tag: "ADJ" },
            { word: "us", tag: "VB" },
        ],
    },
    {
        topic:
            "The service can delete your account without prior notice and without a reason",
        tokens: [
            { word: "delet", tag: "VB" },
            { word: "account", tag: "N" },
            { word: "without", tag: "NOT" },
            { word: "prior", tag: "ADJ" },
            { word: "notic", tag: "N" },
            { word: "reason", tag: "N" },
        ],
    },
    {
        topic:
            "The service may use tracking pixels, web beacons, browser fingerprinting, and/or device fingerprinting on users.",
        tokens: [
            { word: "us", tag: "VB" },
            { word: "track", tag: "VB" },
            { word: "pixel", tag: "N" },
            { word: "web", tag: "N" },
            { word: "beacon", tag: "N" },
            { word: "browser", tag: "N" },
            { word: "fingerprint", tag: "N" },
            { word: "devic", tag: "N" },
            { word: "user", tag: "N" },
        ],
    },
    {
        topic:
            "This service ignores the Do Not Track (DNT) header and tracks users anyway even if they set this header.",
        tokens: [
            { word: "ignor", tag: "VB" },
            { word: "not", tag: "NOT" },
            { word: "track", tag: "VB" },
            { word: "dnt", tag: "N" },
            { word: "header", tag: "N" },
            { word: "user", tag: "N" },
            { word: "set", tag: "N" },
        ],
    },
    {
        topic:
            "This service allows tracking via third-party cookies for purposes including targeted advertising.",
        tokens: [
            { word: "allow", tag: "VB" },
            { word: "track", tag: "N" },
            { word: "parti", tag: "N" },
            { word: "cooki", tag: "N" },
            { word: "advertis", tag: "VB" },
        ],
    },
    {
        topic:
            "Terms may be changed any time at their discretion, without notice to the user.",
        tokens: [
            { word: "term", tag: "N" },
            { word: "chang", tag: "VB" },
            { word: "time", tag: "N" },
            { word: "without", tag: "NOT" },
            { word: "notic", tag: "VB" },
        ],
    },
    {
        topic:
            "The service can sell or otherwise transfer your personal data as part of a bankruptcy proceeding or other type of financial transaction.",
        tokens: [
            { word: "sell", tag: "VB" },
            { word: "transfer", tag: "VB" },
            { word: "data", tag: "N" },
            { word: "bankruptci", tag: "N" },
            { word: "financi", tag: "ADJ" },
            { word: "transact", tag: "N" },
        ],
    },
];

//Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());

app.get("/", (req, res) => {
    res.status(200).json("Yo");
});

app.post("/upload", (req, res) => {
    if (req.files === null) {
        return res.status(400).json({ msg: "No file uploaded" });
    }
    const file = req.files.file;

    pdf(file).then((data) => {
        const paragraphs = data.text.match(/((?:[^\n][\n]?)+)/g);
        const response = { score: 0, agreements: {} };

        paragraphs.forEach((paragraph) => {
            const paragraphTokens = paragraph.tokenizeAndStem();

            const max = { topic: "", probability: -1 };
            for (let i = 0; i < agreements.length; i++) {
                let freqMap = {};
                let agreementTokensLength = agreements[i].tokens.length;
                for (let j = 0; j < agreementTokensLength; j++) {
                    for (let k = 0; k < paragraphTokens.length; k++) {
                        if (
                            agreements[i].tokens[j].word === paragraphTokens[k]
                        ) {
                            if (agreements[i].tokens[j].tag === "VB") {
                                if (paragraphTokens[k - 1] !== "not") {
                                    freqMap[paragraphTokens[k]] = true;
                                }
                            } else {
                                freqMap[paragraphTokens[k]] = true;
                            }
                        }
                    }
                }

                const probability =
                    Object.keys(freqMap).length / agreementTokensLength;
                if (probability > max.probability) {
                    max.probability = probability;
                    max.topic = agreements[i].topic;
                }
            }

            if (!response.agreements[max.topic] && max.probability > 0.5) {
                response.agreements[max.topic] = max.probability;
            }
        });
        const score = Object.keys(response.agreements).length;

        if (score < 3) response.score = "Okay";
        if (3 <= score && score <= 4) response.score = "Mediocre";
        if (5 <= score) response.score = "Awful";

        res.status(200).json(response);
    });
});


//Listeners
app.listen(process.env.PORT, () => {
    console.log(`app is running on port ${process.env.PORT}`);
});
