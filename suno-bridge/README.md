# HINATA AI MUSIC — Sunoプレイヤー連携

本番サイト: https://hinatabokkuri-star.github.io/

Sunoの公式埋め込みを、本番サイトの再生・停止・シーク・音量・速度・次の曲・リピートと連携させる拡張です。対象は https://suno.com/embed/* のiframe内です。操作メッセージは https://hinatabokkuri-star.github.io の親フレームからのものだけ受け付けます。Cookie、認証情報、音声データは読み取りません。音声のダウンロード、録音、外部送信は行いません。

## Edgeに読み込む

1. Edgeで edge://extensions/ を開きます。
2. 「開発者モード」を有効にします。
3. 「展開して読み込み」を押し、E:\Claude\portfolio\suno-bridge を選びます。ZIPを使う場合は先に展開し、manifest.json のあるフォルダーを選びます。
4. 拡張「HINATA Suno player bridge」バージョン **0.2.0** が有効なことを確認し、本番サイトを再読み込みします。

本番でSuno曲を選ぶと公式プレイヤーが表示され、拡張が応答すると「Suno連携中」と表示されます。拡張のない環境でもSuno枠内の ▶ から再生できます。自動再生がブロックされる場合は、枠内の ▶ を一度押してください。音楽ファイルの曲とSuno曲は同じキューに入れられます。Suno曲のクロスフェードは行いません。

既に旧版を読み込んでいる場合は、このフォルダーを更新後、拡張の管理画面で再読み込みを押します。ユーザースクリプト管理拡張を使う場合は bridge.user.js を登録し、iframe内でも動く設定にします。

## 歌詞の時刻合わせ

[テストページ](https://hinatabokkuri-star.github.io/suno-player-test.html)も引き続き使えます。配信を聴きながら歌詞行のボタンを押すと、実際の再生時刻がその行に付きます。時刻はブラウザーのlocalStorageに保存され、LRC保存でテキストとして取り出せます。未設定の行はLRCに含めません。本番の新曲には全文歌詞を掲載し、まだ時刻を付けていないことを表示します。

## データと制約

データ songs.json のスキーマ2では playback_type が file または suno です。Suno曲の file_url は null で、公式URLを suno_url / embed_url に持ちます。音声ファイルを必要とする利用側は playback_type が file の曲だけを選びます。

Suno曲はオンライン再生です。Sunoの埋め込み仕様変更時には拡張の修正が必要になる場合があります。スマートフォンのSafari/PWAでは、このEdge拡張による連携は有効になりません。
