## 2026-08-16 - Task: Write project README

### What was done

重写项目 README，说明 Firecrawl search/fetch provider 的作用、DSH Desktop 安装与挂载、credentials 配置、API key 号池、预设选择、桌面端内置方式、运行限制和开发验证方法。

### Testing

- `npm test`：通过；构建成功，3 项 provider 测试通过。
- `git diff --check`：通过。

### Notes

- `README.md`：改为面向 DSH 用户和桌面维护者的中文项目说明与使用指南。
- `progress.md`：记录本次 README 文档变更。
- 回滚：执行 `git checkout -- README.md progress.md`，或恢复到本次修改前的提交。
