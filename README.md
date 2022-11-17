# Nizika - Google Photos Delete Tool (Puppeteer Headless)

![main](./images/main.gif)

# 概要

Googleフォトの画像を自動的に削除するツールです。
ChromeのヘッドレスブラウザツールであるPuppeteerで動作するため画面のないサーバー等でも動作させることが可能です。
動作確認のためブラウザを表示させての動作も可能です。

# 動作準備

## 必要なソフトウェア

1. Chromeのインストール
2. Chrome拡張の[EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg?hl=ja)のインストール
3. Node.js

## インストール

```
npm install
```

## GoogleログインのためのCookieの準備

Google及びGooglePhotosログイン状態を再現するためにcookieが必要になります。EditThisCookieというChrome拡張を使用してCookie情報をファイルにコピーしてください。
ファイル名は任意です。

![main](./images/cookie.png)

```
touch google.cookie
vi google.cookie

[
{
    "domain": ".google.com",
    "expirationDate": ~~~~,
```

# 実行

## スタンダード (100枚削除)

```
node nizika.js -c google.cookie
```

-cオプションは必須となります。-cオプション引数にcookieファイルを指定してください。

### 実行結果

```
{
  loop: 10,
  not: false,
  select: 10,
  url: 'https://photos.google.com/',
  cokkie: 'google.cookie',
  wait: 25
}
successCount:001 45s 2022/11/17 01:23:48
~
```

デフォルトの動作では10枚削除(select)を10回(loop)繰り返します。つまり10*10=100枚の削除を行います。

# HELP

```
Usage: deleteGooglePhotoPupp [options]

Delete GooglePhoto tool. for puppeteer

Options:
  -c, --cokkie <file>  (must) cookie file path (json) [.google.com and photos.google.com]
  -l, --loop <num>     delete loop num (default: 10)
  -n, --not            not headless option (default: false)
  -s, --select <num>   delete select file num (default: 10)
  -w, --wait <sec>     wait init page load time (default: 25)
  -u, --url <url>      google photos url eg. https://photos.google.com/u/1/ (default: "https://photos.google.com/")
  -h, --help           display help for command
```

# 仕様詳細

# Tips

# GooglePhotsの仕様

