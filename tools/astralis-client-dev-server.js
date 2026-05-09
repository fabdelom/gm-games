const http = require("http");
const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..", "apps", "astralis-client", "debug");
const port = 4173;

const mime = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
};

http
	.createServer((req, res) => {
		const reqPath = req.url === "/" ? "/index.html" : req.url;
		const filePath = path.join(base, reqPath);
		if (!filePath.startsWith(base)) {
			res.writeHead(403);
			res.end("Forbidden");
			return;
		}
		fs.readFile(filePath, (err, data) => {
			if (err) {
				res.writeHead(404);
				res.end("Not found");
				return;
			}
			res.writeHead(200, {
				"Content-Type": mime[path.extname(filePath)] || "text/plain",
			});
			res.end(data);
		});
	})
	.listen(port, () => {
		console.log(`Astralis debug client: http://localhost:${port}`);
	});
