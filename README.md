# Theo dõi chứng khoán Việt Nam

Website để theo dõi các mã cổ phiếu Việt Nam như `FPT`, `VNM`, `VCB`, `HPG`, `MWG`, `SSI`.

## Cách dùng

### Chạy thử trên máy tính

Không mở trực tiếp bằng `file://`. Hãy chạy local server:

```powershell
cd C:\Users\Admin\Documents\Codex\2026-06-23\t\outputs\stock_tracker_app
& "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\local-server.js
```

Sau đó mở:

```text
http://localhost:8787
```

### Chạy online

1. Deploy app lên Netlify kèm thư mục `netlify/functions`.
2. Mở website Netlify.
3. Nhập mã chứng khoán Việt Nam.
4. Bấm `Tải dữ liệu`.

Không cần Alpha Vantage API key. App ưu tiên lấy dữ liệu từ Vietcap/VCI để hỗ trợ HOSE, HNX, UPCOM; nếu VCI lỗi mới fallback sang Yahoo Finance.

## Tính năng

- Giá hiện tại, biến động, khối lượng và biểu đồ giá đóng cửa.
- Đóng trước là giá đóng cửa của phiên liền trước, dùng làm mốc tính tăng/giảm.
- Giá trần/sàn được lấy từ nguồn VCI khi có dữ liệu; nếu thiếu thì app tự tính theo biên độ HOSE 7%, HNX 10%, UPCOM 15% và làm tròn theo bước giá.
- MA 10, MA 50, MA 100, MA 200 tính từ giá đóng cửa, hiển thị ngay dưới biểu đồ giá và vẽ trên biểu đồ.
- RSI 14 tính từ dữ liệu lịch sử giá đóng cửa.
- MACD 12, 26, 9 tính từ dữ liệu lịch sử giá đóng cửa.
- Bảng lịch sử 60 phiên gần nhất, có màu xanh/đỏ cho giá đóng cửa và % thay đổi theo từng phiên.
- Vùng tổng hợp % thay đổi giá trong 3, 7, 10, 14, 21, 30 phiên.
- Tab bảng đánh giá theo thang điểm 100.
- Bảng đánh giá tự động cập nhật theo mã đang tra cứu, gồm xu hướng, volume, RSI, MACD, hỗ trợ/kháng cự, cơ bản/tin tức, sức mạnh ngành và risk/reward.
- Giá trị mua/bán nước ngoài và ước tính trong nước lấy từ dữ liệu bảng giá VCI khi nguồn trả về.

## Đưa lên website

Nên deploy bằng Git/Netlify project để Netlify Function hoạt động. Nếu chỉ mở bằng `file://`, trình duyệt có thể báo `Failed to fetch` vì API chứng khoán chặn CORS.

Thu muc function nam tai:

`netlify/functions/vn-stock.js`

Sau khi deploy đúng, app sẽ gọi dữ liệu qua:

`/.netlify/functions/vn-stock`

## Lưu ý về lỗi Failed to fetch

Lỗi này thường xảy ra khi browser gọi trực tiếp đến API chứng khoán và bị chặn CORS. Proxy serverless trong thư mục `netlify/functions` là cách xử lý đúng hơn cho website online.

## Lưu ý

- App dùng dữ liệu công khai qua proxy, không phải API chính thức có SLA cho sản phẩm thương mại.
- Nếu cần sản phẩm ổn định để kinh doanh, nên dùng nhà cung cấp dữ liệu có hợp đồng/API key riêng.
- Dữ liệu hiển thị phụ thuộc vào các trường mà endpoint trả về cho từng mã cổ phiếu.
