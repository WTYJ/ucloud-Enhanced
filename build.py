#!/usr/bin/env python3
"""将 src/ 下的模块化源码拼接为单文件 ucloud-Enhanced.user.js。"""

from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
SRC_DIR = ROOT / "src"
OUT_FILE = ROOT / "ucloud-Enhanced.user.js"

PARTS = [
    ("00-header.js", "头部元数据与早期钩子（Webpack / 预览器 / XHR）"),
    ("10-core.js", "核心层（设置体系 / 深色引擎 / 助手 UI / 平台共享 API）"),
    ("20-workbench.js", "独立工作台（Shadow DOM：待办 / 课程 / 通知 / 二级视图）"),
    ("30-page-mods.js", "原页面注入与改版（主页 / 详情页 / 课程资源 / 通知页 / 入口）"),
]


def build() -> None:
    chunks: list[str] = []
    for idx, (filename, label) in enumerate(PARTS):
        path = SRC_DIR / filename
        if not path.is_file():
            sys.exit(f"[build] 缺少源码模块: {path}")
        text = path.read_text(encoding="utf-8").replace("\r\n", "\n").rstrip("\n")
        if idx > 0:
            chunks.append(f"\n  // ========== [MODULE: {filename}] {label} ==========\n")
        chunks.append(text)

    output = "\n".join(chunks) + "\n"
    with OUT_FILE.open("w", encoding="utf-8", newline="\n") as f:
        f.write(output)
    line_count = output.count("\n")
    print(f"[build] 已生成 {OUT_FILE.name}（{line_count} 行，{len(output.encode('utf-8'))} 字节）")

    jsc = Path("/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc")
    node = shutil.which("node")
    if node:
        subprocess.run([node, "--check", str(OUT_FILE)], check=True)
        print("[build] node --check 语法检查通过")
    elif jsc.is_file():
        subprocess.run(
            [str(jsc), "-e", f"new Function(readFile({str(OUT_FILE)!r}));"],
            check=True,
        )
        print("[build] jsc 语法检查通过")


if __name__ == "__main__":
    build()
