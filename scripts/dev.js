/**
 * 只针对具体的某个模块打包
 */
const fs = require("fs");
const execa = require("execa"); // 开启子进程打包

const target = "reactivity";

async function build(target) {
  // -c, --config <filename>     使用配置文件（如果使用参数但是值没有指定, 默认就是 rollup.config.js）
  // -w, --watch                 监听 bundle 中的文件并在文件改变时重新构建
  await execa("rollup", ["-cw", "--environment", `TARGET:${target}`], {
    stdio: "inherit",
  });
}
build(target);
