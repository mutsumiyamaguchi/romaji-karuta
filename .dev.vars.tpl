# op inject テンプレート → `.dev.vars` を生成
# 生成: op inject -i .dev.vars.tpl -o .dev.vars
# 注: これはローカル開発用 .dev.vars。PIN_SALT は「開発用」項目を参照（本番saltは別項目 romaji-karuta PIN_SALT に保管）
PIN_SALT=op://R3O Works/romaji-karuta dev-vars/PIN_SALT
