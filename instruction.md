이 앱은 twelve labs api를 주로 사용할거야.

1. 먼저, 이 앱에서는 지정된 twelve labs index에서 가장 최신의 비디오를 불러올거야. 그리고 나서 그 비디오의 user_metadata가 있는지 확인해.
있으면, 그걸 활용하고, 없으면 먼저 user_metadata를 생성할거야.

2. user_metadata는 Twelve Labs의 analyze API를 활용할거야. 사용할 prompt는 아래와 같아. 예상되는 response도 아래 참고해.

List all the products shown in the video with the following details:

Timeline – Timestamp when the product appears (format: start_time–end_time in seconds).

Brand – Name of the brand.

Product Name – Full name of the product.

Location – The approximate location of the product in the video frame in pixel coordinates. Use (x, y, width, height) format based on a 1920x1080 resolution.

Price – The price of the product shown or mentioned, if available.

⚠️ If multiple products appear in the same scene, list them separately with their own location coordinates.

📌 Example format for one entry:

json
{
"timeline": "12.5–15.8",
"brand": "Chanel",
"product_name": "Chanel Le Lift Cream",
"location": [840, 300, 200, 200],
"price": "$135"
}

3. 2에서 받은 답변을 Twelve Labs의 video PUT reqeust롤 통해 user_metadata 키 안에 저장해.

4. 이제, 다시 1로 돌아가서, 가장 최신의 비디오를 보여주면서 user_metadata에 있는 product data들도 같이 보여줘. 그런데 비디오 내내 보여주는게 아니라, 2에서 받은 response처럼, 해당 timeline에, 해당 위치에 지금처럼 쇼핑백 모양 아이콘을 보여주는거야. 그리고 그 아이콘을 클릭하면 오른쪽 Discover Products 란에 제품 디테일을 보여주고, 더불어 링크도 보여줄거야. 이 링크는 amazon.com에 해당 제품의 브랜드 + 제품명이 키워드로 검색된 결과여야해. 