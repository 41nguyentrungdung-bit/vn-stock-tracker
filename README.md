# Theo doi chung khoan Viet Nam

Website de theo doi cac ma co phieu Viet Nam nhu `FPT`, `VNM`, `VCB`, `HPG`, `MWG`, `SSI`.

## Cach dung

### Chay thu tren may tinh

Khong mo truc tiep bang `file://`. Hay chay local server:

```powershell
cd C:\Users\Admin\Documents\Codex\2026-06-23\t\outputs\stock_tracker_app
& "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\local-server.js
```

Sau do mo:

```text
http://localhost:8787
```

### Chay online

1. Deploy app len Netlify kem thu muc `netlify/functions`.
2. Mo website Netlify.
3. Nhap ma chung khoan Viet Nam.
4. Bam `Tai du lieu`.

Khong can Alpha Vantage API key. App lay du lieu gia tu Yahoo Finance qua proxy local/Netlify Function. Khi nhap `FPT`, app se thu `FPT.VN` truoc.

## Tinh nang

- Gia hien tai, bien dong, khoi luong va bieu do gia dong cua.
- MA 10, MA 50, MA 100, MA 200 tinh tu gia dong cua va ve tren bieu do gia.
- RSI 14 tinh tu du lieu lich su gia dong cua.
- MACD 12, 26, 9 tinh tu du lieu lich su gia dong cua.
- Bang lich su 60 phien gan nhat.
- Khu vuc gia tri mua/ban cua nha dau tu da co san trong giao dien, nhung Yahoo Finance khong cung cap du lieu mua/ban theo nhom nha dau tu.

## Dua len website

Nen deploy bang Git/Netlify project de Netlify Function hoat dong. Neu chi mo bang `file://`, trinh duyet co the bao `Failed to fetch` vi API chung khoan chan CORS.

Thu muc function nam tai:

`netlify/functions/vn-stock.js`

Sau khi deploy dung, app se goi du lieu qua:

`/.netlify/functions/vn-stock`

## Luu y ve loi Failed to fetch

Loi nay thuong xay ra khi browser goi truc tiep den API TCBS va bi chan CORS. Proxy serverless trong thu muc `netlify/functions` la cach xu ly dung hon cho website online.

## Luu y

- App dung Yahoo Finance chart API qua proxy, khong phai API chinh thuc co SLA cho san pham thuong mai.
- Neu can san pham on dinh de kinh doanh, nen dung nha cung cap du lieu co hop dong/API key rieng.
- Du lieu hien thi phu thuoc vao cac truong ma endpoint tra ve cho tung ma co phieu.
