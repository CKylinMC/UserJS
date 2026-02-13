---
name: ckui
description: 关于使用CKUI界面库相关功能的技能
---

# CKUI 界面库使用文档

CKUI 是一个现代化、无依赖的 UI 库，专为 Tampermonkey/Greasemonkey 用户脚本设计。

## 版本信息

- **当前版本**: 2.4.5
- **许可证**: GPL-3.0-only
- **作者**: CKylinMC

## 引入方式

在用户脚本头部添加：

```javascript
// @require https://update.greasyfork.org/scripts/564901/1753405/CKUI.js
```
（这个地址中的第二个数字部分会跟随版本更新而变化）

然后在脚本中通过 `unsafeWindow.ckui` 或 `window.ckui` 访问。

## 核心功能

### 1. 通知系统（Notification）

用于显示消息提示，支持成功、错误、警告、信息四种类型。

#### 基础用法

```javascript
// 成功提示
ckui.success('操作成功');
ckui.success('保存成功', '提示');

// 错误提示
ckui.error('操作失败');
ckui.error('保存失败，请重试', '错误');

// 警告提示
ckui.warning('请注意检查输入');
ckui.warning('数据不完整', '警告');

// 信息提示
ckui.info('这是一条提示信息');
ckui.info('请等待处理完成', '提示');
```

#### 高级配置

```javascript
ckui.notification.show({
    title: '标题',
    message: '消息内容',
    type: 'success', // 'success' | 'error' | 'warning' | 'info'
    duration: 3000,  // 显示时长（毫秒），0表示不自动关闭
    closable: true,  // 是否显示关闭按钮
    shadow: false    // 是否使用 Shadow DOM 隔离
});
```

#### 实际应用示例

```javascript
// 来自 ckylin-script-bilibili-up-notes.user.js
ckui.success('备注已保存');
ckui.error('保存失败，请重试');
ckui.warning('标签数量已达上限');
```

---

### 2. 模态框（Modal）

支持多种对话框类型：确认框、提示框、输入框、选择框、排序列表等。

#### 2.1 确认框（Confirm）

```javascript
// 基础用法
const confirmed = await ckui.confirm('确定要删除吗？');
if (confirmed) {
    // 用户点击确定
} else {
    // 用户点击取消或关闭
}

// 自定义标题
const confirmed = await ckui.confirm('确定要删除这条记录吗？', '确认删除');

// 高级配置
const confirmed = await ckui.confirm({
    content: '确定要删除吗？',
    title: '确认删除',
    width: '400px',
    maskClosable: true,  // 点击遮罩层是否关闭
    shadow: false,       // 是否使用 Shadow DOM
    icon: '⚠️',          // 标题图标
    iconShape: 'circle', // 图标形状: 'circle' | 'square'
    iconWidth: '24px'    // 图标大小
});
```

#### 2.2 提示框（Alert）

```javascript
// 基础用法
await ckui.alert('操作已完成');

// 自定义标题
await ckui.alert('保存成功', '提示');

// 高级配置
await ckui.alert({
    content: '操作已完成',
    title: '提示',
    width: '400px',
    shadow: false
});
```

#### 2.3 输入框（Prompt）

```javascript
// 基础用法
const input = await ckui.prompt('请输入名称');
if (input !== null) {
    console.log('用户输入:', input);
}

// 带默认值
const input = await ckui.prompt('请输入名称', '默认名称');

// 高级配置
const input = await ckui.prompt({
    title: '请输入名称',
    defaultValue: '默认名称',
    placeholder: '请输入...',
    width: '400px'
});
```

#### 2.4 选择框（Select）

```javascript
// 基础用法
const selected = await ckui.select({
    title: '请选择',
    options: ['选项1', '选项2', '选项3'],
    defaultValue: '选项1'
});

// 对象数组形式
const selected = await ckui.select({
    title: '选择分类',
    options: [
        { label: '技术', value: 'tech' },
        { label: '生活', value: 'life' },
        { label: '娱乐', value: 'entertainment' }
    ],
    defaultValue: 'tech',
    width: '400px'
});
```

#### 2.5 排序列表（Sortable List）

```javascript
// 基础用法
const sortedItems = await ckui.sortableList({
    title: '排序列表',
    items: ['项目1', '项目2', '项目3'],
    width: '500px'
});

// 对象数组形式
const sortedItems = await ckui.sortableList({
    title: '调整顺序',
    items: [
        { label: '首页', value: 'home' },
        { label: '分类', value: 'category' },
        { label: '关于', value: 'about' }
    ]
});
```

#### 2.6 自定义模态框

```javascript
// 创建自定义内容的模态框
const modal = new ckui.Modal({
    title: '自定义模态框',
    content: '这是自定义内容',
    width: '600px',
    showClose: true,
    footer: null, // null=无底部, 'alert'=只有确定按钮, 默认=确定+取消
    onOk: async () => {
        // 点击确定时的回调
        console.log('确定');
        return true; // 返回 false 阻止关闭
    },
    onCancel: () => {
        // 点击取消时的回调
        console.log('取消');
    }
});

// 显示模态框
const result = await modal.show();

// 使用 DOM 元素作为内容
const content = document.createElement('div');
content.innerHTML = '<p>自定义 HTML 内容</p>';

const modal = new ckui.Modal({
    title: '自定义内容',
    content: content,
    width: '500px'
});
await modal.show();

// 使用 allowHtml 允许 HTML 字符串
const modal = new ckui.Modal({
    title: '标题',
    content: '<p style="color: red;">HTML 内容</p>',
    allowHtml: true
});
```

#### 实际应用示例

```javascript
// 来自 ckylin-script-bilibili-up-notes.user.js
// 删除确认
const confirmed = await ckui.confirm(
    `确定要删除 ${displayName} 的备注吗？`,
    '确认删除'
);
if (confirmed) {
    // 执行删除操作
}

// 编辑备注（使用表单构建器配合模态框）
const form = ckui.form()
    .input({ label: '别名', name: 'alias', value: user.alias })
    .textarea({ label: '备注', name: 'notes', value: user.notes });

const modal = new ckui.Modal({
    title: '编辑备注',
    content: form.render(),
    width: '500px',
    onOk: () => {
        const values = form.getValues();
        // 保存数据
        return true;
    }
});
await modal.show();
```

---

### 3. 浮动窗口（FloatWindow）

可拖拽、可最小化的浮动窗口。

#### 基础用法

```javascript
// 创建浮动窗口
const floatWindow = new ckui.FloatWindow({
    title: '浮动窗口',
    content: '窗口内容',
    width: '400px',
    height: 'auto',
    x: 100,           // 初始 X 坐标
    y: 100,           // 初始 Y 坐标
    draggable: true,  // 是否可拖拽
    minimizable: true, // 是否可最小化
    closable: true,   // 是否可关闭
    shadow: false     // 是否使用 Shadow DOM
});

// 显示窗口
floatWindow.show();

// 关闭窗口
floatWindow.close();

// 最小化/恢复
floatWindow.toggleMinimize();

// 更新内容
floatWindow.setContent('新的内容');
```

#### 高级功能

```javascript
// 移动到鼠标位置
floatWindow.moveToMouse(0, 0); // 偏移量 (offsetX, offsetY)

// 关闭回调
floatWindow.onClose(() => {
    console.log('窗口已关闭');
});

// 一次性关闭回调
floatWindow.onClose(() => {
    console.log('只执行一次');
}, true);

// 移除关闭回调
floatWindow.offClose(callback);

// 刷新窗口配置
floatWindow.refresh({
    title: '新标题',
    content: '新内容'
});

// 使用 DOM 元素作为内容
const content = document.createElement('div');
content.innerHTML = '<button>点击我</button>';

const floatWindow = new ckui.FloatWindow({
    title: '自定义内容',
    content: content
});
floatWindow.show();
```

#### 实际应用示例

```javascript
// 来自 ckylin-script-video-barpic-maker.user.js
// 创建工具栏浮动窗口
createToolbar() {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
    
    // 添加按钮等控件
    // ...
    
    const floatWindow = new Utils.ui.FloatWindow({
        title: 'Video Barpic Maker',
        content: container,
        width: '300px',
        x: 100,
        y: 100,
        draggable: true,
        minimizable: true
    });
    
    return floatWindow.show();
}
```

---

### 4. 表单构建器（FormBuilder）

用于快速构建表单，支持多种输入类型和数据验证。

#### 4.1 基础表单元素

```javascript
// 创建表单构建器
const form = ckui.form();

// 文本输入
form.input({
    label: '用户名',
    name: 'username',
    value: '',
    placeholder: '请输入用户名',
    validator: (value) => {
        if (!value) return '用户名不能为空';
        if (value.length < 3) return '用户名至少3个字符';
        return true;
    },
    onChange: (value, allValues) => {
        console.log('输入值:', value);
    }
});

// 多行文本
form.textarea({
    label: '备注',
    name: 'notes',
    value: '',
    placeholder: '请输入备注',
    validator: (value) => {
        if (value.length > 500) return '备注不能超过500字符';
        return true;
    }
});

// 下拉选择
form.select({
    label: '分类',
    name: 'category',
    value: 'tech',
    options: [
        { label: '技术', value: 'tech' },
        { label: '生活', value: 'life' },
        { label: '娱乐', value: 'entertainment' }
    ],
    onChange: (value) => {
        console.log('选择了:', value);
    }
});

// 复选框
form.checkbox({
    label: '我已阅读并同意条款',
    name: 'agree',
    value: false,
    validator: (checked) => {
        if (!checked) return '请先同意条款';
        return true;
    }
});

// 单选框
form.radio({
    label: '性别',
    name: 'gender',
    value: 'male',
    options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' }
    ]
});

// 按钮
form.button({
    label: '提交',
    primary: true,
    onClick: (values) => {
        console.log('表单值:', values);
    }
});
```

#### 4.2 标签输入（Tags）

```javascript
// 基础标签输入
form.tags({
    label: '标签',
    name: 'tags',
    value: ['标签1', '标签2'],
    placeholder: '输入后按空格或回车添加',
    maxTags: 10,
    validator: (tag, currentTags) => {
        if (tag.length < 2) return '标签至少2个字符';
        if (tag.length > 20) return '标签不能超过20个字符';
        return true;
    },
    onChange: (tags) => {
        console.log('当前标签:', tags);
    }
});

// 可选择的标签输入
form.selectTags({
    label: '选择标签',
    name: 'selectedTags',
    value: [],
    options: ['技术', '生活', '娱乐', '学习', '工作'],
    allowCustom: true,  // 是否允许自定义标签
    maxTags: 5,
    validator: (tag, currentTags) => {
        if (currentTags.includes(tag)) return '标签已存在';
        return true;
    },
    onChange: (tags) => {
        console.log('选中的标签:', tags);
    }
});
```

#### 4.3 高级功能

```javascript
// 隐藏区域（条件显示）
const visible = ckui.reactive(false);

form.hiddenarea({
    visible: visible,
    fields: [
        { type: 'input', label: '高级选项', name: 'advanced' }
    ]
});

// 折叠面板
const isOpen = ckui.reactive(false);

form.detail({
    title: '高级设置',
    open: false,
    openState: isOpen,
    fields: [
        { type: 'input', label: '选项1', name: 'opt1' },
        { type: 'input', label: '选项2', name: 'opt2' }
    ]
});

// 或者使用内容
form.detail({
    title: '详细信息',
    open: true,
    content: '<p>这里是详细内容</p>'
});

// 间距
form.space(16); // 垂直间距 16px
form.space({ size: 20, direction: 'horizontal' }); // 水平间距

// 自定义 HTML
form.html('<p style="color: red;">提示信息</p>');
form.html({
    content: '<div>HTML 内容</div>',
    style: { padding: '10px', background: '#f0f0f0' },
    class: 'custom-class'
});

// 自定义元素
const customElement = document.createElement('div');
customElement.textContent = '自定义元素';

form.element(customElement);
form.element(() => {
    const el = document.createElement('button');
    el.textContent = '动态生成的按钮';
    return el;
});

// 多个元素
form.elements([element1, element2, element3]);
```

#### 4.4 表单操作

```javascript
// 渲染表单
const formElement = form.render();
document.body.appendChild(formElement);

// 获取表单值
const values = form.getValues();
console.log(values); // { username: 'xxx', notes: 'xxx', ... }

// 设置表单值
form.setValues({
    username: '新用户名',
    notes: '新备注'
});

// 数据绑定
const username = ckui.reactive('');
form.bindValue('username', username);

// 响应式订阅
form.values.subscribe((values) => {
    console.log('表单值变化:', values);
});
```

#### 4.5 配合模态框使用

```javascript
// 方式1：直接使用 form API
const result = await ckui.form({
    title: '用户信息',
    width: '500px',
    fields: [
        { type: 'input', label: '姓名', name: 'name' },
        { type: 'input', label: '邮箱', name: 'email' },
        { type: 'textarea', label: '简介', name: 'bio' }
    ]
});

if (result) {
    console.log('提交的数据:', result);
}

// 方式2：手动构建
const form = ckui.form()
    .input({ label: '姓名', name: 'name' })
    .input({ label: '邮箱', name: 'email' })
    .textarea({ label: '简介', name: 'bio' });

const modal = new ckui.Modal({
    title: '用户信息',
    content: form.render(),
    width: '500px',
    onOk: () => {
        const values = form.getValues();
        console.log('提交的数据:', values);
        return true;
    }
});

await modal.show();
```

#### 实际应用示例

```javascript
// 来自 ckylin-script-bilibili-up-notes.user.js
// 编辑UP主备注
static callUIForEditing(_uid, _displayName, _avatarUrl, closeCallback) {
    const user = User.LoadOrCreate(_uid);
    
    const form = Utils.ui.form()
        .input({
            label: 'UP主别名',
            name: 'alias',
            value: user.alias,
            placeholder: '给这个UP主起个别名'
        })
        .textarea({
            label: '备注',
            name: 'notes',
            value: user.notes,
            placeholder: '记录一些信息'
        })
        .tags({
            label: '标签',
            name: 'tags',
            value: user.getTags(),
            maxTags: 10,
            placeholder: '输入标签后按空格或回车添加'
        });

    const modal = new Utils.ui.Modal({
        title: `编辑备注 - ${_displayName}`,
        content: form.render(),
        width: '500px',
        icon: _avatarUrl,
        iconShape: 'circle',
        onOk: () => {
            const values = form.getValues();
            user.alias = values.alias;
            user.notes = values.notes;
            user.setTags(values.tags);
            user.save();
            Utils.ui.success('保存成功');
            return true;
        }
    });

    modal.show().then(() => {
        if (closeCallback) closeCallback();
    });
}
```

---

### 5. 响应式数据（Reactive）

用于创建响应式数据，自动更新 UI。

#### 基础用法

```javascript
// 创建响应式数据
const count = ckui.reactive(0);

// 读取值
console.log(count.value); // 0

// 修改值
count.value = 10;

// 订阅变化
const unsubscribe = count.subscribe((newValue) => {
    console.log('值变化了:', newValue);
});

// 取消订阅
unsubscribe();
```

#### 与表单绑定

```javascript
const username = ckui.reactive('');
const password = ckui.reactive('');

const form = ckui.form()
    .input({
        label: '用户名',
        name: 'username',
        reactive: username
    })
    .input({
        label: '密码',
        name: 'password',
        reactive: password,
        inputType: 'password'
    });

// 监听变化
username.subscribe((value) => {
    console.log('用户名:', value);
});

// 手动设置值会自动更新表单
username.value = 'admin';
```

#### 控制组件显示/隐藏

```javascript
const showAdvanced = ckui.reactive(false);

const form = ckui.form()
    .checkbox({
        label: '显示高级选项',
        name: 'showAdv',
        value: false,
        onChange: (checked) => {
            showAdvanced.value = checked;
        }
    })
    .hiddenarea({
        visible: showAdvanced,
        fields: [
            { type: 'input', label: '高级选项1', name: 'adv1' },
            { type: 'input', label: '高级选项2', name: 'adv2' }
        ]
    });
```

---

### 6. 组件和工具

#### 6.1 基础组件

```javascript
// 按钮
const button = ckui.button({
    label: '点击我',
    primary: true,  // 主要按钮样式
    danger: false,  // 危险按钮样式
    success: false, // 成功按钮样式
    disabled: false,
    onClick: () => {
        console.log('按钮被点击');
    }
});

// 输入框
const input = ckui.input({
    type: 'text',
    placeholder: '请输入',
    value: '',
    reactive: someReactive, // 可选：绑定响应式数据
    onChange: (value) => {
        console.log('输入:', value);
    }
});

// 多行文本
const textarea = ckui.textarea({
    placeholder: '请输入',
    value: '',
    reactive: someReactive,
    onChange: (value) => {
        console.log('输入:', value);
    }
});

// 标签
const label = ckui.label('标签文本');

// 加载动画
const loading = ckui.loading();
```

#### 6.2 布局组件

```javascript
// 行布局
const row = ckui.row(
    ckui.col('内容1'),
    ckui.col('内容2'),
    ckui.col('内容3')
);

// 带配置的行
const row = ckui.row(
    { style: { padding: '10px' } },
    ckui.col('内容1'),
    ckui.col('内容2')
);

// 间距
const space = ckui.space(); // 默认垂直间距
const space = ckui.space(20, 'horizontal'); // 水平间距20px
const space = ckui.space(16, 'vertical'); // 垂直间距16px

// 分割线
const divider = ckui.divider();

// 卡片
const card = ckui.card({
    title: '卡片标题',
    content: '卡片内容',
    style: { padding: '20px' }
});

// 折叠面板
const detail = ckui.detail({
    title: '展开查看更多',
    open: false,
    content: '折叠的内容'
});

// 隐藏区域
const visible = ckui.reactive(false);
const hiddenArea = ckui.hiddenarea({
    visible: visible,
    content: '条件显示的内容'
});
```

#### 6.3 工具函数

```javascript
// 创建元素（类似 React.createElement）
const element = ckui.createElement('div', {
    class: 'my-class',
    style: { color: 'red', padding: '10px' },
    onclick: () => console.log('clicked'),
    dataset: { id: '123' }
}, ['子元素', otherElement]);

// 简写形式
const element = ckui.h('div', { class: 'my-class' }, ['内容']);

// 从 HTML 字符串创建
const element = ckui.html('<div class="container"><p>内容</p></div>');

// 注入样式
ckui.utils.injectStyles(`
    .my-class {
        color: red;
        padding: 10px;
    }
`, 'my-style-id');

// 转义 HTML
const safeHtml = ckui.utils.escapeHtml('<script>alert("xss")</script>');

// 生成唯一 ID
const id = ckui.utils.uuid(); // 'ckui-xxxxx-xxxxx'
```

---

### 7. 实例管理

CKUI 提供实例管理功能，可以通过 ID 获取和重用组件实例。

```javascript
// 创建带 ID 的模态框
const modal = new ckui.Modal({
    id: 'my-modal',
    title: '模态框',
    content: '内容'
});
modal.show();

// 获取已创建的实例
const existingModal = ckui.getModal('my-modal');
if (existingModal) {
    existingModal.refresh({ title: '新标题' });
    existingModal.show();
}

// 创建带 ID 的浮动窗口
const floatWindow = new ckui.FloatWindow({
    id: 'my-window',
    title: '窗口',
    content: '内容'
});
floatWindow.show();

// 获取实例
const existingWindow = ckui.getFloatWindow('my-window');

// 创建带 ID 的表单
const form = ckui.form({ id: 'my-form' });
const existingForm = ckui.getForm('my-form');

// 通用获取方法
const instance = ckui.getInstance('modals', 'my-modal');
const instance = ckui.getInstance('floatWindows', 'my-window');
const instance = ckui.getInstance('forms', 'my-form');
```

---

### 8. 主题配置

#### 切换主题

```javascript
// 切换到暗色主题
ckui.setTheme('dark');

// 切换到亮色主题
ckui.setTheme('light');
```

#### 自定义 CSS 变量

```javascript
// 设置全局 CSS 变量
ckui.setCSSVars({
    'primary': '#007bff',
    'danger': '#dc3545',
    'success': '#28a745',
    'radius': '8px',
    'spacing': '16px'
});

// 或者完整变量名
ckui.setCSSVars({
    '--ckui-primary': '#007bff',
    '--ckui-radius': '8px'
});

// 在特定元素上设置
const element = document.querySelector('.my-element');
ckui.setCSSVars({
    'primary': '#ff0000'
}, element);
```

#### 可配置的 CSS 变量

```css
--ckui-primary: 主色
--ckui-primary-hover: 主色悬停
--ckui-secondary: 次要色
--ckui-secondary-hover: 次要色悬停
--ckui-border: 边框颜色
--ckui-border-dark: 深色边框
--ckui-text: 文本颜色
--ckui-text-secondary: 次要文本
--ckui-text-muted: 弱化文本
--ckui-bg: 背景色
--ckui-bg-secondary: 次要背景
--ckui-success: 成功色
--ckui-danger: 危险色
--ckui-warning: 警告色
--ckui-info: 信息色
--ckui-radius: 圆角半径
--ckui-shadow: 阴影
--ckui-spacing: 间距
```

---

### 9. Shadow DOM 支持

CKUI 支持使用 Shadow DOM 隔离组件样式，避免与页面样式冲突。

```javascript
// 在通知中使用 Shadow DOM
ckui.notification.show({
    title: '提示',
    message: '消息',
    shadow: true
});

// 在模态框中使用
const modal = new ckui.Modal({
    title: '标题',
    content: '内容',
    shadow: true
});

// 在浮动窗口中使用
const floatWindow = new ckui.FloatWindow({
    title: '窗口',
    content: '内容',
    shadow: true
});
```

---

### 10. Z-Index 管理

```javascript
// 获取当前 z-index 基础值
const baseZIndex = ckui.getZIndexBase(); // 默认 999990

// 设置新的基础值
ckui.setZIndexBase(1000000);
```

---

### 11. 鼠标追踪

启用全局鼠标位置追踪，用于浮动窗口移动到鼠标位置。

```javascript
// 启用鼠标追踪
ckui.trackMouseEvent();

// 之后可以使用
floatWindow.moveToMouse(0, -50); // 在鼠标上方50px显示
```

---

## 完整示例

### 示例1：用户信息管理

```javascript
// 创建用户信息编辑表单
async function editUser(userData) {
    const form = ckui.form()
        .input({
            label: '用户名',
            name: 'username',
            value: userData.username,
            validator: (value) => {
                if (!value) return '用户名不能为空';
                if (value.length < 3) return '用户名至少3个字符';
                return true;
            }
        })
        .input({
            label: '邮箱',
            name: 'email',
            value: userData.email,
            validator: (value) => {
                if (!value) return '邮箱不能为空';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return '邮箱格式不正确';
                }
                return true;
            }
        })
        .select({
            label: '角色',
            name: 'role',
            value: userData.role,
            options: [
                { label: '管理员', value: 'admin' },
                { label: '用户', value: 'user' },
                { label: '访客', value: 'guest' }
            ]
        })
        .tags({
            label: '标签',
            name: 'tags',
            value: userData.tags || [],
            maxTags: 5
        })
        .textarea({
            label: '个人简介',
            name: 'bio',
            value: userData.bio,
            validator: (value) => {
                if (value.length > 200) return '简介不能超过200字符';
                return true;
            }
        });

    const modal = new ckui.Modal({
        title: '编辑用户信息',
        content: form.render(),
        width: '600px',
        icon: userData.avatar,
        iconShape: 'circle',
        onOk: async () => {
            const values = form.getValues();
            
            // 保存数据
            try {
                await saveUserData(values);
                ckui.success('保存成功');
                return true;
            } catch (error) {
                ckui.error('保存失败: ' + error.message);
                return false; // 阻止关闭
            }
        }
    });

    await modal.show();
}
```

### 示例2：设置面板

```javascript
// 创建设置面板
function openSettings() {
    const settings = loadSettings();
    
    // 响应式状态
    const showAdvanced = ckui.reactive(false);
    const enableFeature = ckui.reactive(settings.enableFeature);
    
    const form = ckui.form()
        .select({
            label: '主题',
            name: 'theme',
            value: settings.theme,
            options: [
                { label: '浅色', value: 'light' },
                { label: '深色', value: 'dark' },
                { label: '自动', value: 'auto' }
            ],
            onChange: (value) => {
                if (value !== 'auto') {
                    ckui.setTheme(value);
                }
            }
        })
        .checkbox({
            label: '启用高级功能',
            name: 'enableFeature',
            value: settings.enableFeature,
            onChange: (checked) => {
                enableFeature.value = checked;
                showAdvanced.value = checked;
            }
        })
        .hiddenarea({
            visible: showAdvanced,
            fields: [
                {
                    type: 'input',
                    label: 'API 地址',
                    name: 'apiUrl',
                    value: settings.apiUrl
                },
                {
                    type: 'input',
                    label: '超时时间（秒）',
                    name: 'timeout',
                    value: settings.timeout,
                    inputType: 'number'
                }
            ]
        })
        .space(20)
        .detail({
            title: '关于',
            open: false,
            content: `
                <div style="padding: 10px;">
                    <p>版本: 1.0.0</p>
                    <p>作者: Your Name</p>
                </div>
            `
        });

    const modal = new ckui.Modal({
        title: '设置',
        content: form.render(),
        width: '500px',
        onOk: () => {
            const values = form.getValues();
            saveSettings(values);
            ckui.success('设置已保存');
            return true;
        }
    });

    modal.show();
}
```

### 示例3：工具栏浮动窗口

```javascript
// 创建工具栏
function createToolbar() {
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 200px;
    `;
    
    // 添加按钮
    const btn1 = ckui.button({
        label: '📸 截图',
        onClick: () => {
            ckui.info('开始截图');
            // 执行截图逻辑
        }
    });
    
    const btn2 = ckui.button({
        label: '⚙️ 设置',
        onClick: () => {
            openSettings();
        }
    });
    
    const btn3 = ckui.button({
        label: '❌ 关闭',
        danger: true,
        onClick: () => {
            floatWindow.close();
        }
    });
    
    container.appendChild(btn1);
    container.appendChild(ckui.divider());
    container.appendChild(btn2);
    container.appendChild(ckui.space(10));
    container.appendChild(btn3);
    
    const floatWindow = new ckui.FloatWindow({
        id: 'toolbar',
        title: '工具栏',
        content: container,
        width: '220px',
        x: 100,
        y: 100,
        draggable: true,
        minimizable: true
    });
    
    // 启用鼠标追踪并移动到鼠标位置
    ckui.trackMouseEvent();
    floatWindow.show().moveToMouse(0, -100);
    
    return floatWindow;
}

// 使用
const toolbar = createToolbar();
```

### 示例4：数据导入导出

```javascript
// 导出数据
async function exportData() {
    const data = getAllData();
    const json = JSON.stringify(data, null, 2);
    
    const modal = new ckui.Modal({
        title: '导出数据',
        content: ckui.textarea({
            value: json,
            style: { width: '100%', height: '400px', fontFamily: 'monospace' }
        }),
        width: '600px',
        footer: ckui.createElement('div', {
            style: { display: 'flex', justifyContent: 'flex-end', gap: '10px' }
        }, [
            ckui.button({
                label: '复制',
                onClick: async () => {
                    await navigator.clipboard.writeText(json);
                    ckui.success('已复制到剪贴板');
                }
            }),
            ckui.button({
                label: '下载',
                primary: true,
                onClick: () => {
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `data-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    ckui.success('下载成功');
                }
            })
        ])
    });
    
    await modal.show();
}

// 导入数据
async function importData() {
    const input = await ckui.prompt({
        title: '导入数据',
        placeholder: '粘贴 JSON 数据'
    });
    
    if (input) {
        try {
            const data = JSON.parse(input);
            
            // 验证数据
            if (!validateData(data)) {
                ckui.error('数据格式不正确');
                return;
            }
            
            // 确认导入
            const confirmed = await ckui.confirm(
                `将导入 ${data.length} 条记录，是否继续？`,
                '确认导入'
            );
            
            if (confirmed) {
                importAllData(data);
                ckui.success('导入成功');
            }
        } catch (error) {
            ckui.error('解析失败: ' + error.message);
        }
    }
}
```

---

## 注意事项

1. **样式隔离**: 所有 CKUI 组件都使用 `.ckui-root` 类包裹，样式独立不会污染页面
2. **Shadow DOM**: 对于样式冲突严重的页面，建议使用 `shadow: true` 选项
3. **z-index**: 默认基础 z-index 为 999990，可通过 `setZIndexBase()` 修改
4. **响应式数据**: 使用 `reactive()` 创建的数据会自动触发 UI 更新
5. **实例复用**: 通过设置 `id` 选项可以复用组件实例，避免重复创建
6. **异步操作**: 所有对话框方法（`alert`, `confirm`, `prompt` 等）都返回 Promise
7. **表单验证**: 表单验证在输入和失焦时自动触发，返回 `true` 表示通过，返回字符串表示错误信息
8. **主题切换**: 主题切换会影响已存在的所有 CKUI 组件

---

## 调试技巧

```javascript
// 查看 CKUI 版本
console.log('CKUI Version:', ckui.version);

// 查看所有实例
// （实例存储在内部，可通过 ID 获取）

// 检查是否正确加载
if (typeof ckui !== 'undefined' && ckui.__initialized) {
    console.log('CKUI 已正确加载');
} else {
    console.error('CKUI 未加载');
}
```

---

## 常见问题

### Q: 模态框被页面元素遮挡？
A: 使用 `ckui.setZIndexBase(更大的值)` 或在模态框中使用 `shadow: true`

### Q: 样式与页面冲突？
A: 所有组件都支持 `shadow: true` 选项，使用 Shadow DOM 完全隔离样式

### Q: 如何获取表单的实时值？
A: 使用 `form.values.subscribe()` 订阅表单值的变化

### Q: 浮动窗口如何记住位置？
A: 在关闭时保存窗口的 x, y 坐标，下次创建时传入

### Q: 如何自定义样式？
A: 使用 `ckui.setCSSVars()` 修改 CSS 变量，或通过 `style` 属性传入自定义样式

---

## 更新日志

### v2.4.5
- 完善的主题支持（亮色/暗色）
- 新增 Shadow DOM 支持
- 优化表单构建器
- 新增标签输入组件
- 新增折叠面板和隐藏区域
- 优化响应式数据绑定
- 新增浮动窗口鼠标定位功能
- 完善实例管理系统

---

本文档基于 CKUI v2.4.5 版本编写，包含了所有核心功能和最佳实践。