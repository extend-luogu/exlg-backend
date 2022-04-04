# exlg-badge

Back End of [EXLG](https://github.com/extend-luogu) Badge

## Overview

请求中 `uid` 的数据格式为整数或字符串均可，但同一数组中要求数据类型保持一致

响应中对象的所有键均为字符串

## 生成 token

### Requset

```http
GET /token/generate/
```

### Response

32 位字符串

```json
"0123456789abcdef0123456789abcdef"
```

## 验证 token

### Requset

Payload 为剪贴板 ID 或 URL

```http
POST /token/verify/
Content-Type: application/json
```

```json
"https://www.luogu.com.cn/paste/k2b0dyio"
```

```json
"//www.luogu.org/paste/k2b0dyio"
```

```json
"k2b0dyio"
```

### Response

一个包含 `uid` 与 `token` 的对象

```json
{
    "uid": 108135,
    "token": "0123456789abcdef0123456789abcdef"
}
```

## 批量获取 badge

### Request

Payload 为一个包含字符串或整数的数组，注意：类型必须一致

```http
POST /badge/mget/
Content-Type: application/json
```
```json
["", "108135", "224978"]
```

```json
[108135, 224978]
```

### Response

对象：键为字符串 `uid`；值为描述 badge 的对象，其中键为字符串，值的类型由设置时的内容决定

```json
{
    "": {},
    "108135": {
        "size": 1,
        "text": "wxh"
    },
    "224978": {
        "text": "o2"
    }
}
```

## 批量修改 badge

`@admin_required`
要求 EXLG 数据库管理员权限

### Request

Payload 对象中键 `data` 的值为对象，格式与 `/badge/mget/` 响应相同

```http
POST /badge/mset/
Content-Type: application/json
```

```json
{
    "uid": 108135,
    "token": "0123456789abcdef0123456789abcdef",
    "data": {
        "108135": {
            "text": "wxh",
            "size": 1
        },
        "224978": {
            "text": "o2"
        }
    }
}
```

### Respond

即 Payload JSON 对象中键 `data` 的值

```json
{
    "108135": {
        "size": 1,
        "text": "wxh"
    },
    "224978": {
        "text": "o2"
    }
}
```

## 修改 badge

`@token_required`
要求同时包含 `token` 以及其对应的 `uid`

### Request

Payload 对象中键 `data` 的值为一个描述 badge 内容与样式的对象

```http
POST /badge/set/
Content-Type: application/j son
```

```json
{
    "uid": 108135,
    "token": "0123456789abcdef0123456789abcdef",
    "data": {
        "text": "wxh",
        "size": 1
    }
}
```

### Response

与 `/badge/mset/` 响应对象的格式相同，仍为 object，但仅包含单个用户的数据，键为字符串 `uid`

```json
{
    "108135": {
        "size": 1,
        "text": "wxh"
    }
}
```
