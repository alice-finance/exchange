const fs = require("fs");
const {execSync} = require("child_process");

const ABI_PATH = "abis";

if (!fs.existsSync(ABI_PATH)) {
    fs.mkdirSync(ABI_PATH);
}

fs.readdirSync("build/contracts").forEach(file => {
    const {abi} = JSON.parse(fs.readFileSync("build/contracts/" + file, "utf-8"));
    if (abi && abi.length > 0) {
        const path = ABI_PATH + "/" + file;
        console.log("Building " + path + "...");
        fs.writeFileSync(path, JSON.stringify(abi, null, 2), "utf-8");
        execSync("git add " + path);
    }
});
