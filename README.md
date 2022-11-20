# Nizika - Google Photos Delete Tool (Puppeteer Headless)

![main](./images/main.gif)

# 概要

Googleフォトの画像を自動的に削除(ゴミ箱に格納)するツールです。Googleフォトのストレージを0Gにすることを目的に開発しています。Googleフォトは仕様としてゴミ箱に入れた時点でストレージの使用量はその分削減されます。
ChromeのヘッドレスブラウザツールであるPuppeteerで動作するため画面のないサーバー等でも動作させることが可能です。
動作確認のためブラウザを表示させての動作も可能です。

## 性能
- 1000枚の画像を削除するのに16分
- 5000枚の画像を削除するのに80分

# 動作準備

## 必要なソフトウェア

1. Chromeのインストール (EditThisCookieを使うために必要)
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
}
successCount:001 40s 2022/11/18 01:29:21
successCount:002 40s 2022/11/18 01:30:02
~
successCount:010 40s 2022/11/18 01:35:28
6min (410s)
~
```

デフォルトの動作では10枚削除(select)を10回(loop)繰り返します。つまり10*10=100枚の削除を行います。


## 画像を50枚選択して削除 x 10回ループ (500枚削除)

```
node nizika.js -c google.cookie -s 50
```

```
successCount:001 78s 2022/11/17 01:23:48
successCount:002 77s 2022/11/17 01:25:06
~
successCount:010 77s 2022/11/17 01:35:29
13min (781s)
```

画像の選択に関しては50枚を上限に考えておいたほうがよいです。それ以上画像選択するとGooglePhoto側のページの処理が重くなり意図しない動作になります。


## 画像を50枚選択して削除 x 100回ループ (5000枚削除)

```
node nizika.js -c google.cookie -s 50 -l 100
```

大量の画像を削除したい場合-lオプションの値を999などにします。ただしブラウザのメモリを食いつぶすことにもなるため推奨しません。永続的に画像を削除し続ける場合は-dオプションを使って定期的にブラウザを閉じて再起動するほうが安全です。

## 画像を永遠に削除し続ける -d オプション (推奨実行方法)

```
node nizika.js -c google.cookie -s 20 -l 100 -d
```

サーバーで実行させるときや、寝る前に自宅PCで動作させる時などを想定しています。
この場合のnizikaのプログラムの処理は下記のようになります。

1. 20枚の画像を選択し削除する
2. [1.]を50回繰り返す (1000枚削除)
3. ブラウザを閉じる
4. ブラウザを再度立ち上げて[1.]から繰り返す


## ヘッドレスをOFFにする（ブラウザを表示させながら動作)

```
node nizika.js -c google.cookie -n
```


# HELP

```
Usage: nizika [options]

Delete GooglePhoto tool. for puppeteer

Options:
  -c, --cookie <file>  (must) cookie file path (json) [.google.com and photos.google.com]
  -d, --daemon         execute daemon mode (default: false)
  -l, --loop <num>     delete loop num (default: 10)
  -n, --not            not headless option (default: false)
  -s, --select <num>   delete select file num (default: 10)
  -u, --url <url>      google photos url eg. https://photos.google.com/u/1/ (default: "https://photos.google.com/")
  -h, --help           display help for command
```

# 仕様詳細

## 画像の選択削除

画像の選択、削除に関してはGoogleフォトのキーボードショートカットを使用しています。そのためGoogleフォトのHTML仕様が変更されても動作には影響をうけません。

![main](./images/keys.png)


### 画像がなくなったことを検知する処理はありません

nizikaでは現行の仕様でGoogleフォトの画像がなくなったことを検知する処理がないため、画像がある程度少なくなったら目視で削除することを推奨します。

# Tips

## Macで長時間動作させるとき

ディスプレイをOFFにする機能を無効化する必要があります。ディスプレイをOFFにすると省電力モードになりネットワーク系の動作も機能しなくなります。スクリーンセーバーを起動しつつ寝る前にMacブックで動作させるのを推奨します。

## Googleアカウントの切り替え

1つのブラウザで複数のGoogleアカウントにログインしている場合Cookieが別なのではなくアクセスするURLでアカウントが切り替わるようです、そのため下記コマンドで変更したいURLを指定してください。

```
node nizika.js -c google.cookie -u https://photos.google.com/u/1/
```

# GooglePhotosの仕様

## 根源的問題として一括削除がブラウザからできない

Googleドライブと違い、すべての画像を一括で削除できない仕様になっています。そのためnizikaの様なツールが必要になります。

## ゴミ箱の仕様

Google Photosは画像をゴミ箱に入れた時点でGoogleOneのストレージ容量から削除されます。その点がGmailとGoogleドライブとは異なります。

## 一部の画像を削除してもGoogleOneの使用量が減らない問題

アプリのGoogleフォトで同期されたファイルの一部はGoogleフォトのストレージ容量に加算されない仕様になっています。そのためファイルを削除してもGoogleフォトの容量が減らないことがあります。該当するのは画像の(i)インフォボタンを押して下記のような情報が出る画像です。

![main](./images/ios.png)

## 画像が灰色になって破損したように見える問題

画像を削除しつづけると、画像が灰色になっていつまで立っても表示されないことががあります。
灰色の画像は選択、クリックもできないためnizikaプログラムもバグってしまいます。一応この状態を検知して右のスライドバーで適当な日付に移動して処理を再開するコードを実装しています。画像が灰色になるのはGoogleフォトの既知の問題のようでGoogleで検索すると似たような事象が起きている人はいるようです。灰色になった画像は時間がたてば見れるようになるためおそらく画像の数が変わったことで、あまり見られない画像に対してのGoogleフォトの読み込みが間に合っていないなどが推測されます。

![main](./images/hason.png)

