const fs = require("fs");
const { execSync } = require("child_process");

const ABI_PATH = "abis";
const NETWORKS_PATH = "networks";

if (!fs.existsSync(ABI_PATH)) {
  fs.mkdirSync(ABI_PATH);
}
fs.readdirSync(ABI_PATH).forEach(file => fs.unlinkSync(ABI_PATH + "/" + file));

if (!fs.existsSync(NETWORKS_PATH)) {
  fs.mkdirSync(NETWORKS_PATH);
}
fs.readdirSync(NETWORKS_PATH).forEach(file => fs.unlinkSync(NETWORKS_PATH + "/" + file));

const { contracts } = JSON.parse(fs.readFileSync(".openzeppelin/project.json", "utf8"));
const networks = {};

fs.readdirSync(".openzeppelin/").forEach(file => {
  if (!["project.json", ".session"].includes(file)) {
    const { proxies } = JSON.parse(fs.readFileSync(".openzeppelin/" + file, "utf-8"));
    const networkId = file.replace(".json", "").replace("dev-", "");


    for (key of Object.keys(proxies)) {
      const contractName = key.replace("@alice-finance/exchange/", "");
      networks[contractName] = {
        ...networks[contractName],
        [networkId]: {
          address: proxies[key][0].address
        }
      };
    }
  }
});

fs.readdirSync("build/contracts").forEach(file => {
  const { abi } = JSON.parse(fs.readFileSync("build/contracts/" + file, "utf-8"));
  const contractName = file.replace(".json", "");
  if (contracts.hasOwnProperty(contractName)) {
    if (abi && abi.length > 0) {
      const path = ABI_PATH + "/" + file;
      fs.writeFileSync(path, JSON.stringify(abi, null, 2), "utf-8");
      execSync("git add " + path);
    }

    if (networks.hasOwnProperty(contractName)) {
      const path = NETWORKS_PATH + "/" + file;
      fs.writeFileSync(path, JSON.stringify(networks[contractName], null, 2), "utf-8");
      execSync("git add " + path);
    }
  }
});
