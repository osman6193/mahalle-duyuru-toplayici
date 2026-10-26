#!/usr/bin/env bash
# Mahalle Duyuru toplayıcı — Ubuntu 24.04 kurulum betiği
# Sunucuda root olarak çalıştır:
#   curl -fsSL https://raw.githubusercontent.com/osman6193/mahalle-duyuru-toplayici/main/kurulum.sh | bash
set -euo pipefail

REPO="${REPO:-https://github.com/osman6193/mahalle-duyuru-toplayici.git}"
DIZIN=/opt/mahalle-duyuru-toplayici
KULLANICI=toplayici
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

adim() { echo -e "\n\033[1;36m==> $*\033[0m"; }

[ "$(id -u)" -eq 0 ] || { echo "Bu betiği root olarak çalıştır (sudo -i)."; exit 1; }

adim "1/7 Sistem güncelleniyor"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ca-certificates ufw unattended-upgrades

adim "2/7 Güvenlik duvarı (sadece SSH açık)"
ufw allow OpenSSH
ufw --force enable

adim "3/7 Node.js 22 kuruluyor"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

adim "4/7 Kullanıcı ve kod"
id "$KULLANICI" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$KULLANICI"
git config --global --add safe.directory "$DIZIN"
if [ -d "$DIZIN/.git" ]; then
  git -C "$DIZIN" pull --ff-only
else
  git clone "$REPO" "$DIZIN"
fi
chown -R "$KULLANICI":"$KULLANICI" "$DIZIN"

adim "5/7 Paketler ve gizli tarayıcı (Chromium) — birkaç dakika sürebilir"
cd "$DIZIN"
sudo -u "$KULLANICI" npm ci --omit=dev
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
npx --yes playwright install --with-deps chromium
chown -R "$KULLANICI":"$KULLANICI" "$PLAYWRIGHT_BROWSERS_PATH"
echo "PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH" > /etc/environment.d/playwright.conf 2>/dev/null || true

adim "6/7 Supabase anahtarı"
if [ ! -f "$DIZIN/.env" ]; then
  echo "Supabase panel > Project Settings > API Keys > service_role anahtarını yapıştır."
  echo "(Yazarken ekranda görünmez, normal. Yapıştırıp Enter'a bas.)"
  read -rsp "service_role anahtarı: " ANAHTAR < /dev/tty; echo
  [ -n "$ANAHTAR" ] || { echo "Anahtar boş olamaz."; exit 1; }
  printf 'SUPABASE_URL=https://brbzeoxsuqikoxpjvjhs.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=%s\nPLAYWRIGHT_BROWSERS_PATH=%s\n' "$ANAHTAR" "$PLAYWRIGHT_BROWSERS_PATH" > "$DIZIN/.env"
  chown "$KULLANICI":"$KULLANICI" "$DIZIN/.env"
  chmod 600 "$DIZIN/.env"
else
  echo ".env zaten var, dokunulmadı."
fi

adim "7/7 Zamanlayıcı (her 10 dakikada bir) ve log"
cat > /usr/local/bin/toplayici-calistir <<'SCRIPT'
#!/usr/bin/env bash
# Her çalışmada GitHub'dan son kodu çek, paketler değiştiyse güncelle, sonra çalıştır.
set -uo pipefail
cd /opt/mahalle-duyuru-toplayici
ESKI=$(git rev-parse HEAD:package-lock.json 2>/dev/null || echo yok)
git pull -q --ff-only || echo "uyarı: git pull başarısız, eski kodla devam"
YENI=$(git rev-parse HEAD:package-lock.json 2>/dev/null || echo yok)
[ "$ESKI" != "$YENI" ] && npm ci --omit=dev --silent
exec timeout 540 node --env-file=.env src/calistir.js
SCRIPT
chmod 755 /usr/local/bin/toplayici-calistir

touch /var/log/toplayici.log && chown "$KULLANICI":"$KULLANICI" /var/log/toplayici.log
cat > /etc/cron.d/mahalle-duyuru <<CRON
*/10 * * * * $KULLANICI /usr/local/bin/toplayici-calistir >> /var/log/toplayici.log 2>&1
CRON
cat > /etc/logrotate.d/toplayici <<'ROT'
/var/log/toplayici.log { weekly rotate 4 compress missingok notifempty copytruncate }
ROT

adim "Bağlantı testi"
sudo -u "$KULLANICI" node --env-file="$DIZIN/.env" "$DIZIN/src/test-baglanti.js" || true

echo -e "\n\033[1;32mKurulum bitti ✅\033[0m"
echo "Keşif aracını çalıştırmak için:"
echo "  cd $DIZIN && sudo -u $KULLANICI npm run kesif"
echo "Logları izlemek için:  tail -f /var/log/toplayici.log"
