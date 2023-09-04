// ライブラリの読み込み
const { Client, GatewayIntentBits, MessageEmbed } = require("discord.js");
const dotenv = require('dotenv');
const fs = require('fs');

//インテント等の設定
const client = new Client({
    intents: Object.values(GatewayIntentBits).filter(Number.isInteger)
});

//コマンドの登録、サーバーの確認等
const commands = {};
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands[command.data.name] = command;
}
client.once('ready', async () => {
    console.log('Botが起動しました。');
    console.log('参加しているサーバー:');
    client.guilds.cache.forEach(async (guild) => {
        const updatedGuild = await guild.fetch();
        const owner = await client.users.fetch(updatedGuild.ownerId);
        console.log(`- サーバー名: ${updatedGuild.name}`);
        console.log(`- サーバーID: ${updatedGuild.id}`);
        console.log(`- オーナー名: ${owner.tag}`);
        console.log(`- オーナーID: ${updatedGuild.ownerId}`);
        console.log('--------------------------');
    });
  
    const data = [];
    for (const commandName in commands) {
        data.push(commands[commandName].data);
    }

    // コマンドの登録
    client.application.commands.set(data)
    .then(() => console.log('コマンドが正常に登録されました。'))
    .catch(console.error);
});

//コマンドが実行された際の動作
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
        return;
    }
    const command = commands[interaction.commandName];
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'コマンドの内部でエラーが発生しました。',
            ephemeral: true,
        });
    }
});

function normalizeText(text) {
    // 大文字を小文字に変換
    let normalizedText = text.toLowerCase();
  
    // 全角を半角に変換
    normalizedText = normalizedText.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    // スペースと改行を削除
    normalizedText = normalizedText.replace(/\s+/g, '');
  
    return normalizedText;
}

function countBadWords(text) {
    // ワードリストを読み込む
    const badWords = JSON.parse(fs.readFileSync('data/bad_word.json'));

    // テキストを正規化
    const normalizedText = normalizeText(text);

    // 含まれているワードをカウント
    let count = 0;
    for (const word of badWords) {
        if (normalizedText.includes(word)) {
            count++;
        }
    }

    return count;
}

function performCreditAddition(userId, userLogs, creditUsers) {
    // 現在のタイムスタンプを取得
    const now = Date.now();

    // 過去1ヶ月のタイムスタンプを計算
    const oneMonthAgo = now - 0;

    // ユーザーのログを取得
    const userLog = userLogs[userId];

    // 一ヶ月間の減点行為がない場合の処理
    if (userLog) {
        const latestTimestamp = Object.keys(userLog)[Object.keys(userLog).length - 1];
        if (true === true) {
            console.log("テスト1")
            if (creditUsers.hasOwnProperty(userId)) {
                console.log("テスト2")
                // 信用ポイントに100ポイント加点する
                const oldCredit = creditUsers[userId].credit;
                console.log(creditUsers[userId].credit)
                creditUsers[userId].credit += 100;

                // 修正されたcredit_usersをファイルに保存する
                saveCreditUsers(creditUsers);

                // 加点のログを保存する
                saveUserLog(userId, "加点", oldCredit, creditUsers[userId].credit);

                // 任意: 加点をログに記録する（必要に応じてメッセージをカスタマイズしてください）
                console.log(`ユーザー ${userId} に100ポイント加点しました。新しい信用ポイント: ${creditUsers[userId].credit}`);
            }
        }
    }
}



// メッセージが送信された時の処理
client.on('messageCreate', async (message) => {
  // 最新の処理日時を取得
  const latestLog = LatestLog(message.author.id);
  const latestLogTimestamp = latestLog.timestamp;

  if (message.author.bot) return;

  // メッセージの内容から不適切な単語をカウント
  const badWordCount = countBadWords(message.content);

  // credit_user.jsonから信用ポイントを読み込む
  const creditUsers = loadCreditUsers();

  // ユーザーがcredit_usersに存在する場合
  if (creditUsers.hasOwnProperty(message.author.id)) {
    // 不適切な単語が2つ以上含まれている場合
    if (badWordCount >= 1) {
      // 信用ポイントから30点減点する
      const oldCredit = creditUsers[message.author.id].credit;
      creditUsers[message.author.id].credit -= 50;

      // 最終処理日時を更新する
      creditUsers[message.author.id].lastProcessed = Date.now();

      // 更新されたcredit_usersをファイルに保存する
      saveCreditUsers(creditUsers);

      // 減点のログを保存する
      saveUserLog(message.author.id, "減点", oldCredit, creditUsers[message.author.id].credit);

      // 任意: 減点をログに記録する（必要に応じてメッセージをカスタマイズしてください）
      console.log(`ユーザー ${message.author.id} から30点減点しました。新しい信用ポイント: ${creditUsers[message.author.id].credit}`);
    } else {
      // 一ヶ月間何も処理がなかった場合に100ポイント加点する
      const oneMonthInMilliseconds = 30 * 24 * 60 * 60 * 1000; // Assuming one month is 30 days
      const currentTime = Date.now();
      if (currentTime - latestLogTimestamp >= oneMonthInMilliseconds) {
        const oldCredit = creditUsers[message.author.id].credit;
        creditUsers[message.author.id].credit += 100;


        // 最終処理日時を更新する
        creditUsers[message.author.id].lastProcessed = Date.now();

        // 更新されたcredit_usersをファイルに保存する
        saveCreditUsers(creditUsers);

        // 加点のログを保存する
        saveUserLog(message.author.id, "加点", oldCredit, creditUsers[message.author.id].credit);

        // 任意: 加点をログに記録する（必要に応じてメッセージをカスタマイズしてください）
        console.log(`ユーザー ${message.author.id} に100点加点しました。新しい信用ポイント: ${creditUsers[message.author.id].credit}`);
      }
    }
  } else {
    // ユーザーがcredit_usersに見つからない場合は、デフォルトで1000点を与える
    creditUsers[message.author.id] = {
      credit: 1000,
      lastProcessed: Date.now() // 初回登録時に現在の日時を記録する
    };

    // 修正されたcredit_usersをファイルに保存する
    saveCreditUsers(creditUsers);
    // 登録のログを保存する
    saveUserLog(message.author.id, "登録", 0, 1000);

    // 任意: 登録の通知をログに記録する（必要に応じてメッセージをカスタマイズしてください）
    console.log(`ユーザー ${message.author.id} をcredit_usersに新しく登録しました。信用ポイント: 1000`);
  }
});


function LatestLog(userId) {
    // credit_user.jsonからログを読み込む
    const logs = loadCreditLogs();

    // ユーザーの最新のログ情報を初期化
    let latestLog = null;
    let latestLogTimestamp = 0;

    // ログをループして指定したユーザーの最新のログ情報を探す
    for (const logKey in logs) {
        const logTimestamp = parseInt(logKey);
        const log = logs[logKey];

        if (log.user_id === userId && logTimestamp > latestLogTimestamp) {
            latestLog = log;
            latestLogTimestamp = logTimestamp;
        }
    }

    // ユーザーの最新のログ情報とタイムスタンプをオブジェクトとして返す
    return {
        log: latestLog,
        timestamp: latestLogTimestamp
    };
}


client.login(process.env.DISCORD_TOKEN);

const express = require('express');
const app = express();
const port = 3000;
const path = require('path');

const users = [
  { username: 'kuuhaku2021', password: 'Naokinokazokuha5ninn' },
  { username: 'pridal_chevron', password: 'pridal0121' },
  // 他のユーザー情報も追加
];

// JSONデータを解析するミドルウェア
app.use(express.json());

// URLエンコードされたデータを解析するミドルウェア
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  try {
    const htmlContent = fs.readFileSync('public/login.html', 'utf8');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send('ファイルの読み込みエラー');
  }
});

app.post('/', (req, res) => {
  const { username, password } = req.body;
  const isValidUser = users.some((user) => user.username === username && user.password === password);
  // ログデータを作成
  const logData = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    username: username,
    result: isValidUser ? "成功" : "失敗"
  };
  
  // ログを保存
  saveLog(logData);
  if (!isValidUser) {
    const htmlContent = fs.readFileSync('public/login.html', 'utf8');
    res.send(htmlContent);
  } else {
    try {
      const htmlContent = fs.readFileSync('public/index.html', 'utf8');
      res.send(htmlContent);
    } catch (err) {
      res.status(500).send('ファイルの読み込みエラー');
    }
  }
});

app.get('/scripts.js', (req, res) => {
  try {
    const htmlContent = fs.readFileSync('public/scripts.js', 'utf8');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send('Error reading the file');
  }
});

app.get('/styles.css', (req, res) => {
  try {
    const htmlContent = fs.readFileSync('public/styles.css', 'utf8');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send('Error reading the file');
  }
});

app.get('/dashboard.html', (req, res) => {
  try {
    const htmlContent = fs.readFileSync('public/dashboard.html', 'utf8');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send('Error reading the file');
  }
});

app.get('/user.html', (req, res) => {
  try {
    const htmlContent = fs.readFileSync('public/user.html', 'utf8');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send('Error reading the file');
  }
});

app.get('/log.html', (req, res) => {
  try {
    const htmlContent = fs.readFileSync('public/log.html', 'utf8');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send('Error reading the file');
  }
});

app.get('/bad.html', (req, res) => {
  try {
    const htmlContent = fs.readFileSync('public/bad.html', 'utf8');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send('Error reading the file');
  }
});
app.use(express.json());

// JSONファイルからcreditUsersを読み込む
function loadCreditUsers() {
    const data = fs.readFileSync('credit_user.json');
    return JSON.parse(data);
}

// ログを保存する関数
function saveLog(logData) {
  const logFilePath = 'connect_log.json';

  let logs = [];

  // ログファイルが存在する場合、内容をパースして logs に代入
  if (fs.existsSync(logFilePath)) {
    const data = fs.readFileSync(logFilePath, 'utf8');
    try {
      logs = JSON.parse(data);
    } catch (err) {
      console.error('Error parsing log file:', err);
    }
  }

  // 新しいログを logs 配列に追加
  logs.push(logData);

  // logs をファイルに書き込み
  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
}


// JSONファイルからcreditUsersを読み込む
function loadCreditLogs() {
    const data = fs.readFileSync('user_log.json');
    return JSON.parse(data);
}

// creditUsersをJSONファイルに保存する
function saveCreditUsers(creditUsers) {
    fs.writeFileSync('credit_user.json', JSON.stringify(creditUsers, null, 2));
}

// ユーザーを削除
app.delete('/creditUsers/remove/:username', (req, res) => {
    const { username } = req.params;
    const creditUsers = loadCreditUsers();
    if (creditUsers.hasOwnProperty(username)) {
        delete creditUsers[username];
        saveCreditUsers(creditUsers);
        res.send('ユーザーが削除されました。');
    } else {
        res.status(404).send('ユーザーが見つかりません。');
    }
});

// 新しいユーザーを追加
app.post('/creditUsers/add', (req, res) => {
    const { username, credit } = req.body;
    const creditUsers = loadCreditUsers();
    if (!creditUsers.hasOwnProperty(username)) {
        creditUsers[username] = {
            credit: parseInt(credit)
        };
        saveCreditUsers(creditUsers);
        res.send('新しいユーザーが追加されました。');
    } else {
        res.status(400).send('ユーザー名が既に存在します。');
    }
});


// 全てのcredit usersを取得
app.get('/creditUsers', (req, res) => {
    const creditUsers = loadCreditUsers();
    res.json(creditUsers);
});

// 全てのcredit usersを取得
app.get('/logs', (req, res) => {
    const creditLogs = loadCreditLogs();
    res.json(creditLogs);
});


// 特定のcredit userを取得
app.get('/creditUsers/:username', (req, res) => {
    const { username } = req.params;
    const creditUsers = loadCreditUsers();
    if (creditUsers.hasOwnProperty(username)) {
        res.json(creditUsers[username]);
    } else {
        res.status(404).send('ユーザーが見つかりません。');
    }
});
// ユーザーの信用ポイントを編集
app.put('/creditUsers/edit/:username/:credit', (req, res) => {
    const { username, credit } = req.params;
    const creditUsers = loadCreditUsers();
    if (creditUsers.hasOwnProperty(username)) {
        const oldCredit = creditUsers[username].credit;
        creditUsers[username].credit = parseInt(credit);
        saveCreditUsers(creditUsers);
    
        // 信用ポイントが更新されたときにログを保存する
        saveUserLog(username, "更新", oldCredit, parseInt(credit));
        res.send('ユーザーの信用ポイントが更新されました。');
    } else {
        res.status(404).send('ユーザーが見つかりません。');
    }
});

// ユーザーの信用ポイント更新時のログを保存する
function saveUserLog(userId, type, oldCredit, newCredit) {
    const timestamp = Date.now();
    const userLogEntry = {
        [timestamp]: {
            user_id: userId,
            type: type,
            old_credit_point: oldCredit,
            new_credit_point: newCredit,
        },
    };
  
    // 既存のuser_log.jsonからログを読み込む（存在しない場合や正しいJSONでない場合は無視）
    let userLogs = {};
    try {
        const data = fs.readFileSync('user_log.json');
        userLogs = JSON.parse(data);
    } catch (error) {
        // ファイルが存在しないか、正しいJSONでない場合はエラーを無視
    }

    // 新しいログエントリーを既存のログとマージする
    userLogs = { ...userLogs, ...userLogEntry };

    // 更新されたログをuser_log.jsonに保存する
    fs.writeFileSync('user_log.json', JSON.stringify(userLogs, null, 2));
}

// GETリクエストでユーザー名を取得するエンドポイント
app.get('/getUsername/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await client.users.fetch(userId);
        if (user) {
            res.json({ username: user.username });
        } else {
            res.status(404).json({ error: 'ユーザーが見つかりません。' });
        }
    } catch (error) {
        res.status(500).json({ error: 'ユーザー名の取得中にエラーが発生しました。' });
    }
});

// APIエンドポイント：すべての不適切な単語を取得
app.get('/badWords', (req, res) => {
    const badWords = JSON.parse(fs.readFileSync('data/bad_word.json'));
    res.json(badWords);
});

// APIエンドポイント：新しい不適切な単語を追加
app.post('/badWords/add', (req, res) => {
    const { badWord } = req.body;
    const badWords = JSON.parse(fs.readFileSync('data/bad_word.json'));
    if (!badWords.includes(badWord)) {
        badWords.push(badWord);
        fs.writeFileSync('data/bad_word.json', JSON.stringify(badWords, null, 2));
        res.send('不適切な単語が追加されました。');
    } else {
        res.status(400).send('すでに存在する不適切な単語です。');
    }
});

// APIエンドポイント：不適切な単語を削除
app.delete('/badWords/remove/:badWord', (req, res) => {
    const { badWord } = req.params;
    const badWords = JSON.parse(fs.readFileSync('data/bad_word.json'));
    if (badWords.includes(badWord)) {
        const updatedBadWords = badWords.filter((word) => word !== badWord);
        fs.writeFileSync('data/bad_word.json', JSON.stringify(updatedBadWords, null, 2));
        res.send('不適切な単語が削除されました。');
    } else {
        res.status(404).send('不適切な単語が見つかりません。');
    }
});

app.listen(port, () => console.log(`サイトの起動が完了しました。`));
