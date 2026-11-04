# watch-guilds

Discord サーバの絵文字やステッカーなどを監視し、テキストチャンネルに一覧の投稿や変更の通知を行う Bot です。

## 機能

- **絵文字一覧**: サーバの絵文字を一覧にしたメッセージをテキストチャンネルへ自動で投稿します。
- **絵文字の通知**: 絵文字が追加・更新・削除されたときに通知メッセージを投稿します。
- **ステッカーの通知**: ステッカーが追加・更新・削除されたときに通知メッセージを投稿します。
- 絵文字は自然順ソート (natsort) で人間が読みやすい順に並べます。
- 設定時に Bot の権限を確認し、設定ミスを防ぎます。
- 表示言語は日本語のみです。

## インストール

### アプリケーションの起動

Node.js (バージョンは [.node-version](.node-version) を参照) と pnpm が必要です。

1. `data/config.json` を作成し、Bot のトークンを記述します。設定ファイルの形式は [schema/Configuration.json](schema/Configuration.json) を参照してください。

   ```json
   {
     "discord": {
       "token": "Bot のトークン"
     }
   }
   ```

2. 依存関係をインストールして起動します。

   ```bash
   pnpm install
   pnpm start
   ```

Docker で動かす場合は、`./data` を `/data` にマウントして `docker compose up -d --build` を実行します。この場合の設定ファイルは `data/config.json` です。サーバごとの設定や絵文字一覧のデータも `data` ディレクトリ以下に保存されます。

### Bot の登録とサーバへの招待

[Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成し、Bot のトークンを発行します。招待 URL には `bot` と `applications.commands` のスコープを指定して、Bot をサーバに招待してください。

### Bot の権限

サーバに対して、Bot に次の権限が必要です。

- 表現の管理
- 監査ログの表示

投稿先に設定するチャンネルでは、さらに次の権限が必要です。

- チャンネルを見る
- メッセージを送信
- 埋め込みリンク
- メッセージ履歴を読む

### コマンドの登録

「サーバの管理」権限を持つユーザーが、次のコマンドで設定します。

- `/watch-guilds register`
- `/watch-guilds set-channel list-emoji <ListEmojiChannel>`
- `/watch-guilds set-channel notifier-emoji <NotifierEmojiChannel>`
- `/watch-guilds set-channel notifier-sticker <NotifierStickerChannel>`
- `/watch-guilds set-channel notifier-sound-board <NotifierSoundBoardChannel>`
- `/watch-guilds regenerate`

そのほかに、`unregister` (対象サーバから外す)、`remove-channel` (チャンネル設定の解除)、`check-permissions` (必要な権限の確認) があり、いずれも「サーバの管理」権限が必要です。`update-commands` (このサーバのコマンドの更新) と `regenerate` は権限の制限がなく、誰でも実行できます。なお、各コマンドは状態に応じて表示されます。`register` は未登録のサーバでのみ、`unregister`・`set-channel`・`remove-channel`・`update-commands` は登録済みのサーバでのみ使えます。`regenerate` は `list-emoji` のチャンネルを設定した後に使えます。

## ライセンス

このプロジェクトのライセンスは [MIT License](LICENSE) です。
