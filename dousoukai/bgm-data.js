window.DOUSOUKAI_BGM_DATA = {
  AUDIO_DIR: 'audio/',
  SCHOOL_ORDER: ['yasaka','yusai'],
  SCHOOLS: {
    yasaka:{
      name:'粟田小学校',
      hash:'awata',
      theme:{ accent:'#b06f00', dark:'#8a5600', light:'#fff3dc', play:'#1d7a43' },
    },
    yusai:{
      name:'有済小学校',
      hash:'yusai',
      theme:{ accent:'#16775f', dark:'#0f5847', light:'#e3f5ee', play:'#1d7a43' },
    },
  },
  ARR: {
    chorus:{ name:'合唱版', desc:'校歌本来の雰囲気に近い、合唱を意識したアレンジ。式典らしさや母校への思いを、最も直接的に感じられる音源です。', scene:'開会・閉会・校歌紹介・記念映像・全員で思い出を共有する場面', schools:{ yasaka:[['テイク1','chorus_1.mp3',131],['テイク2','chorus_2.mp3',133]], yusai:[['テイク1','arisai_chorus_1.mp3',98],['テイク2','arisai_chorus_2.mp3',107]] } },

    lounge_jazz:{ name:'ホテルラウンジ風ジャズ版', desc:'ピアノ・クラリネット・ミュートトランペット・ストリングスをイメージした、上品なラウンジジャズ風。昭和のホテルラウンジのような落ち着いた雰囲気です。', scene:'開場中・歓談・食事・受付・同窓会全体のBGM', schools:{ yasaka:[['テイク1','lounge_jazz_1.mp3',179],['テイク2','lounge_jazz_2.mp3',184]], yusai:[['テイク1','arisai_lounge_jazz_1.mp3',139],['テイク2','arisai_lounge_jazz_2.mp3',171]] } },
    piano_trio:{ name:'ピアノ・トリオ版', desc:'ピアノ・ウッドベース・ブラシドラムの小編成ジャズ。落ち着いた上品な響きで、長い時間流しても使いやすい曲調です。', scene:'歓談・食事中・受付・会場BGM全般', schools:{ yasaka:[['テイク1','piano_trio_1.mp3',117],['テイク2','piano_trio_2.mp3',149]], yusai:[['テイク1','arisai_piano_trio_1.mp3',137],['テイク2','arisai_piano_trio_2.mp3',135]] } },
    bossa:{ name:'ボサノバ喫茶版', desc:'ガットギター・エレピ・フルートをイメージした、やわらかなボサノバ調。昭和の喫茶店のような、落ち着いた懐かしさとおしゃれな雰囲気です。', scene:'歓談・食事中・受付・リラックスした会場BGM', schools:{ yasaka:[['テイク1','bossa_1.mp3',123],['テイク2','bossa_2.mp3',138]], yusai:[['テイク1','arisai_bossa_1.mp3',149],['テイク2','arisai_bossa_2.mp3',143]] } },
    nostalgic_jazz:{ name:'ノスタルジックジャズ版', desc:'落ち着いたジャズの響きで校歌をアレンジ。派手すぎず、会話の邪魔になりにくい曲調です。', scene:'受付・歓談・食事中・開会前のBGM', schools:{ yasaka:[['テイク1','nostalgic_jazz_1.mp3',177],['テイク2','nostalgic_jazz_2.mp3',149]], yusai:[['テイク1','arisai_nostalgic_jazz_1.mp3',170],['テイク2','arisai_nostalgic_jazz_2.mp3',137]] } },

    strings_piano:{ name:'ストリングス＋ピアノ 映画音楽版', desc:'ピアノと弦楽器を中心にした、やさしく感動的なアレンジ。懐かしさ・感謝・再会の喜びをしっとりと表現しています。', scene:'写真スライド・恩師紹介・思い出映像・静かな歓談・感動的な場面', schools:{ yasaka:[['テイク1','strings_piano_1.mp3',159],['テイク2','strings_piano_2.mp3',153]], yusai:[['テイク1','arisai_strings_piano_1.mp3',101],['テイク2','arisai_strings_piano_2.mp3',103]] } },
    harmonica_folk:{ name:'ハーモニカ＋ギターの郷愁フォーク版', desc:'ハーモニカとアコースティックギターを中心にした、素朴で温かなアレンジ。昔の通学路や学生時代の記憶を思い起こさせます。', scene:'写真スライド・閉会前・歓談・懐かしさを演出したい場面', schools:{ yasaka:[['テイク1','harmonica_folk_1.mp3',146],['テイク2','harmonica_folk_2.mp3',134]], yusai:[['テイク1','arisai_harmonica_folk_1.mp3',125],['テイク2','arisai_harmonica_folk_2.mp3',164]] } },
    humming:{ name:'鼻歌・ハミング合唱版', desc:'歌詞をはっきり歌わず、ハミングや鼻歌のような雰囲気で校歌を表現。同級生が昔を思い出し、そっと口ずさんでいるような温かさがあります。', scene:'写真スライド・閉会前・エンドロール・静かに振り返る場面', schools:{ yasaka:[['テイク1','humming_1.mp3',83],['テイク2','humming_2.mp3',93]], yusai:[['テイク1','arisai_humming_1.mp3',79],['テイク2','arisai_humming_2.mp3',72]] } },

    full_orchestra:{ name:'フルオーケストラ式典版', desc:'校歌の旋律を壮麗なオーケストラで表現した、最も式典向きのアレンジ。堂々とした雰囲気で節目の場面にふさわしい曲調です。', scene:'開会・閉会・記念映像のクライマックス・集合写真・式典演出', schools:{ yasaka:[['テイク1','full_orchestra_1.mp3',164],['テイク2','full_orchestra_2.mp3',149]], yusai:[['テイク1','arisai_full_orchestra_1.mp3',119],['テイク2','arisai_full_orchestra_2.mp3',117]] } },
    orchestra:{ name:'オーケストラ版', desc:'弦楽器・木管・金管を中心とした、広がりのあるオーケストラアレンジ。格式があり、記念行事らしい華やかさを演出できます。', scene:'開会前BGM・入場・記念映像・集合写真スライド・式典的な場面', schools:{ yasaka:[['再生','orchestra_2.mp3',152]], yusai:[['テイク1','arisai_orchestra_1.mp3',160],['テイク2','arisai_orchestra_2.mp3',133]] } },
    woodwind:{ name:'木管五重奏版', desc:'フルート・オーボエ・クラリネット・ファゴット・ホルンをイメージした室内楽風アレンジ。上品で落ち着いた雰囲気です。', scene:'恩師紹介・写真スライド・受付・静かな歓談・式典前後のBGM', schools:{ yasaka:[['テイク1','woodwind_1.mp3',209],['テイク2','woodwind_2.mp3',179]], yusai:[['テイク1','arisai_woodwind_1.mp3',144],['テイク2','arisai_woodwind_2.mp3',83]] } },
    closing_reprise:{ name:'閉会リプライズ版', desc:'同窓会の締めくくりに合う、穏やかで温かいアレンジ。感謝や再会の余韻を残しながら、やさしく会を締めます。', scene:'閉会・退場・エンドロール・最後の写真スライド', schools:{ yasaka:[['テイク1','closing_reprise_1.mp3',154],['テイク2','closing_reprise_2.mp3',129]], yusai:[['テイク1','arisai_closing_reprise_1.mp3',108],['テイク2','arisai_closing_reprise_2.mp3',103]] } },

    swing:{ name:'軽いスウィング版', desc:'軽快なリズムとジャズ風の響きを取り入れた、明るく楽しいアレンジ。少し華やかな曲調です。', scene:'乾杯後・歓談後半・写真撮影・会場を明るくしたい場面', schools:{ yasaka:[['テイク1','swing_1.mp3',162],['テイク2','swing_2.mp3',177]], yusai:[['テイク1','arisai_swing_1.mp3',212],['テイク2','arisai_swing_2.mp3',145]] } },
    showa_kayo:{ name:'昭和歌謡インスト版', desc:'サックス・エレピ・ストリングスをイメージした昭和歌謡風のインスト。懐かしいテレビ音楽やレコードのような雰囲気です。', scene:'歓談・余興・聴き比べ企画・昭和らしい懐かしさを演出したい場面', schools:{ yasaka:[['テイク1','showa_kayo_1.mp3',164],['テイク2','showa_kayo_2.mp3',152]], yusai:[['テイク1','arisai_showa_kayo_1.mp3',97],['テイク2','arisai_showa_kayo_2.mp3',139]] } },

    chindon:{ name:'チンドン屋・昭和商店街版', desc:'クラリネット・アコーディオン・チンドン太鼓をイメージした昭和の商店街風。懐かしく少しユーモラスで、会場の笑顔を誘う変わり種です。', scene:'余興・聴き比べ企画・サプライズ演出・歓談中のアクセント', schools:{ yasaka:[['テイク1','chindon_1.mp3',132],['テイク2','chindon_2.mp3',141]] } },
    africa:{ name:'アフリカ音楽版', desc:'カリンバ・マリンバ・アコースティックギター・パーカッションをイメージした、明るく温かいアレンジ。軽やかで遊び心のある雰囲気です。', scene:'余興・歓談中の変化球BGM・聴き比べ企画・会場を明るくしたい場面', schools:{ yasaka:[['テイク1','africa_1.mp3',144],['テイク2','africa_2.mp3',163]] } },
    electronic:{ name:'電子音楽版', desc:'シンセサイザーや電子音を中心にした近未来的なアレンジ。原曲のメロディを残しつつ、現代的で意外性のある雰囲気です。', scene:'余興・映像演出・聴き比べ企画・若い世代も交えた演出', schools:{ yasaka:[['再生','electronic_1.mp3',153]] } },
    minimal:{ name:'ミニマル・ネオクラシカル電子音楽版', desc:'ピアノ・弦楽器・控えめな電子音を組み合わせた、現代的で静かなアレンジ。未来的でありながら派手すぎず、校歌の旋律を落ち着いた形で聴かせます。', scene:'映像演出・スライドショー・余興・少し変わった雰囲気を出したい場面', schools:{ yasaka:[['再生','minimal_1.mp3',151]] } },
    sports_march:{ name:'昭和運動会マーチ版', desc:'入場行進や運動会を思い出す、明るく元気なマーチ風アレンジ。余興として会場の空気を少し楽しく変えたい場面に向きます。', scene:'余興・聴き比べ企画・歓談中のアクセント', schools:{ yusai:[['テイク1','arisai_sports_march_1.mp3',65],['テイク2','arisai_sports_march_2.mp3',65]] } },
    hawaiian:{ name:'ハワイアン・ウクレレ版', desc:'ウクレレや南国風のゆったりした響きで校歌をアレンジ。肩の力を抜いて楽しめる、軽いおまけ曲です。', scene:'余興・歓談中の変化球BGM・リラックスした場面', schools:{ yusai:[['テイク1','arisai_hawaiian_1.mp3',134],['テイク2','arisai_hawaiian_2.mp3',109]] } },
    toy_music:{ name:'おもちゃの音楽会版', desc:'トイピアノや小さな打楽器をイメージした、子どもっぽくかわいいアレンジ。校歌が少しだけおゆうぎ会のように聞こえる遊び枠です。', scene:'余興・聴き比べ企画・会場を和ませたい場面', schools:{ yusai:[['テイク1','arisai_toy_music_1.mp3',65],['テイク2','arisai_toy_music_2.mp3',73]] } },
    horror:{ name:'旧校舎ホラー風版', desc:'短調の雰囲気やオルゴール風の響きで、校歌を少し不思議で怖い雰囲気にした余興アレンジです。', scene:'余興・聴き比べ企画・サプライズ演出', schools:{ yusai:[['テイク1','arisai_horror_1.mp3',114],['テイク2','arisai_horror_2.mp3',95]] } },
    bon_odori:{ name:'盆踊り版', desc:'太鼓や笛をイメージした、校歌が夏祭りの盆踊りになったようなアレンジ。分かりやすいおまけ枠です。', scene:'余興・聴き比べ企画・明るく笑える場面', schools:{ yusai:[['テイク1','arisai_bon_odori_1.mp3',127],['テイク2','arisai_bon_odori_2.mp3',129]] } },
  },
  GROUPS: [
    { id:'relax', ico:'🍵', title:'開場前・受付・歓談・食事中', sub:'落ち着いて、会話の邪魔にならないBGM', items:['lounge_jazz','piano_trio','bossa','nostalgic_jazz'] },
    { id:'memory', ico:'📷', title:'写真スライド・思い出映像', sub:'しっとり懐かしく、感動的な場面に', items:['strings_piano','harmonica_folk','humming'] },
    { id:'ceremony', ico:'🎓', title:'開会・閉会・記念撮影', sub:'式典・節目にふさわしい、格式ある曲調', items:['full_orchestra','orchestra','woodwind','closing_reprise'] },
    { id:'lively', ico:'🥂', title:'乾杯後・歓談を盛り上げる', sub:'明るく華やかに、会場をあたためる', items:['swing','showa_kayo'] },
    { id:'fun', ico:'🎉', title:'余興・聴き比べ', sub:'学校ごとに違う、遊び心のあるおまけアレンジ', bonus:true },
  ],
  BONUS_BY_SCHOOL: {
    yasaka:['chindon','africa','electronic','minimal'],
    yusai:['sports_march','hawaiian','toy_music','horror','bon_odori'],
  },
};
