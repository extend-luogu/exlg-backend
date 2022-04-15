# exlg-badge

Back End of ['Extend Luogu'](https://github.com/extend-luogu/extend-luogu)

## Overview

请求的 base URL 为 `https://exlg.piterator.com`

请求中 `uid` 的数据格式为整数或字符串均可

响应中对象的所有键均为字符串

## 生成 token

### Requset

```http
GET /token/generate
Host: exlg.piterator.com
```

### Response

`data` 为一个 32 位字符串

```json
{
    "status": 200,
    "data": "0123456789abcdef0123456789abcdef"
}
```

## 验证 token

### Requset

URL 结尾包含的参数为剪贴板 ID

```http
GET /token/verify/:paste
Host: exlg.piterator.com
Content-Type: application/json
```

### Response

`data` 为一个包含 `uid` 与 `token` 的对象

```json
{
    "status": 200,
    "data": {
        "uid": 108135,
        "token": "0123456789abcdef0123456789abcdef"
    }
}
```

```json
{
    "status": 401,
    "error": "剪贴板内容未找到"
}
```

```json
{
    "status": 403,
    "error": "Invalid paste content: "
}
```

## 检查 token 有效期

### Request

Payload 即为 `/token/verify/:paste` 响应中的 `data`

```http
POST /token/ttl
Host: exlg.piterator.com
Content-Type: application/json
```

```json
{
    "uid": 108135,
    "token": "0123456789abcdef0123456789abcdef"
}
```

### Response

响应 HTTP 状态码为 `200 OK` 时，`data` 为一个整数，表示到过期时间的秒数

```json
{
    "status": 200,
    "data": 259199
}
```

响应 HTTP 状态码为 `401 Unauthorized` 时，`data` 为一个包含错误信息的 JSON 对象

```json
{
    "status": 401,
    "error": "Authentication failed"
}
```

## 批量获取 badge

`@token_required`
要求 Payload 同时包含 `token` 以及其对应的 `uid`

### Request

Payload 的 `data` 为一个包含字符串或整数的数组

```http
POST /badge/mget
Host: exlg.piterator.com
Content-Type: application/json
```

```json
{
    "uid": "108135",
    "token": "a",
    "data": [
        "",
        108135,
        "224978"
    ]
}
```

### Response

对象：键为字符串 `uid`；值为描述 badge 的对象，其中键、值的类型均为字符串

```json
{
    "status": 200,
    "data": {
        "": {},
        "108135": {
            "text": "wxh",
            "bg": "",
            "fg": ""
        },
        "224978": {
            "text": "o2",
            "bg": "",
            "fg": ""
        }
    }
}
```

## 修改 badge

`@token_required`

### Request

若 badge 不存在，则 Payload 对象中键 `activation` 的值必须为合法的激活密钥；键 `data` 的值为一个描述 badge 内容与样式的对象

```http
POST /badge/set
Host: exlg.piterator.com
Content-Type: application/j son
```

```json
{
    "uid": 108135,
    "token": "0123456789abcdef0123456789abcdef",
    "activation": "<exlgactivationkey>",
    "data": {
        "text": "wxh",
        "bg": ""
    }
}
```

```json
{
    "uid": 108135,
    "token": "0123456789abcdef0123456789abcdef",
    "data": {
        "text": "wxh"
    }
}
```

### Response

`data` 与 `/badge/mget` 响应对象的格式相同，但仅包含单个用户的数据，键为字符串 `uid`，且表示 badge 内容的对象仅包含设置/修改的键

```json
{
    "status": 200,
    "data": {
        "108135": {
            "text": "wxh",
            "bg": ""
        }
    }
}
```
