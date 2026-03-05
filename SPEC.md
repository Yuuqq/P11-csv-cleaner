# P11 Spec - CSV 不触网一键洗表机

## 1. Summary

- **Project ID**: P11
- **Project Name**: CSV 不触网一键洗表机
- **Goal**: 纯前端对上传的 CSV 进行字段去重、空值填充、正则替换、格式规范化，全程离线
- **User Persona**: 数据记者

## 2. Scope

- **In scope**:
  - 纯前端对上传的 CSV 进行字段去重、空值填充、正则替换、格式规范化
  - 全程离线
- **Out of scope**:
  - 后端代理或服务端逻辑
  - API Key 持久化存储

## 3. UX

- **Core workflow**: 用户输入 → 前端处理 → 结果展示
- **Inputs**: CSV 文件
- **Outputs**: 清洗后 CSV + 表格/图表预览
- **States**: empty (初始) / loading (处理中) / error (失败) / success (完成)

## 4. Functional Requirements

1. FR-1: 纯前端对上传的 CSV 进行字段去重、空值填充、正则替换、格式规范化
2. FR-2: 结果可视化展示
3. FR-3: 错误状态可见提示

## 5. Non-Functional Requirements

- **Performance**: 核心任务 3 分钟内完成
- **Accessibility**: 键盘导航、aria-label、焦点可见、WCAG AA 对比度
- **Privacy**: 本地处理优先，不默认上传数据
- **Browser support**: 现代 Chromium (Chrome 110+)

## 6. Dependencies

- **Libraries/CDNs**: Papa Parse (CDN)、ECharts (CDN)
- **Local data**: 无

## 7. Risks & Mitigations

- **Risk**: 超大文件浏览器内存不足
- **Mitigation**: 限制文件大小并提示

## 8. Acceptance Criteria

- [ ] 支持上传并解析 CSV
- [ ] 支持去重与空值填补
- [ ] 支持导出清洗后 CSV
- [ ] 图表预览可用
- [ ] 纯静态页面可部署 GitHub Pages
- [ ] 移动端可用
- [ ] 隐私提示清晰可见
