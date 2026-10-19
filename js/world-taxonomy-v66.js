/* DUDU World Atlas V66: six GENRE GATES and many low-tier mission seeds.
 * Preview catalog only. Real pact, rank and rewards require server authority.
 */
(function(){
'use strict';
const genres=[
 {genreId:'ancient',name:'Cổ đại',symbol:'♜',tone:'clock',summary:'Cung đình, gia trạch, giang hồ, điền văn và bí án.'},
 {genreId:'modern',name:'Hiện đại',symbol:'⌂',tone:'city',summary:'Học đường, đô thị, công sở, thể thao, giới giải trí.'},
 {genreId:'era',name:'Niên đại',symbol:'◷',tone:'mist',summary:'Những lát cắt đời sống qua từng giai đoạn lịch sử.'},
 {genreId:'future',name:'Tương lai',symbol:'✧',tone:'star',summary:'Công nghệ, không gian, AI và thực tại mô phỏng.'},
 {genreId:'cultivation',name:'Tu tiên',symbol:'☯',tone:'forest',summary:'Môn phái, linh điền, bí cảnh và con đường tu luyện.'},
 {genreId:'apocalypse',name:'Mạt thế',symbol:'◇',tone:'sea',summary:'Sinh tồn, trú ẩn và tái thiết sau biến cố.'}
];
/* Stable tuple: suffix, rank, title, subgenre, plot hook. Append; never reorder IDs. */
const collections={
 ancient:[
 ['an-f01','F','Quán trọ Quan Đạo','giang hồ','Giải quyết xung đột ở một quán trọ biên lộ.'],
 ['an-f02','F','Mùa Gặt Phủ Nam','điền văn','Giữ mùa vụ trước lời đồn thất thiệt.'],
 ['an-f03','F','Thư Sinh Đầu Huyện','khoa cử','Tìm lại hồ sơ mất trước kỳ thi.'],
 ['an-f04','F','Tiệm May Hoa Đăng','thương nghiệp','Xử lý đơn hàng bất thường trong đêm hội.'],
 ['an-f05','F','Bí Mật Hậu Viện','gia trạch','Lần dấu một bức thư trong gia đình quyền quý.'],
 ['an-e01','E','Lệnh Bài Cấm Thành','cung đình','Phân biệt sắc lệnh thật và thư giả mạo.'],
 ['an-e02','E','Vụ Án Dưới Mưa','trinh thám cổ đại','Lần theo lời chứng tại phủ huyện.'],
 ['an-e03','E','Tiêu Cục Ngàn Dặm','hành tẩu giang hồ','Bảo vệ chuyến hàng xuyên qua các trạm dịch.']
 ],
 modern:[
 ['mo-f01','F','Ngày Đầu Chuyển Trường','học đường','Tìm ra người đứng sau những lá thư nặc danh.'],
 ['mo-f02','F','Căn Hộ Tầng Mười','đời thường','Hòa giải những rắc rối của khu chung cư.'],
 ['mo-f03','F','Bản Demo Cuối Cùng','công sở','Cứu một dự án trước buổi công bố.'],
 ['mo-f04','F','Góc Máy Trường Quay','giải trí','Tìm vật dụng biến mất ở hậu trường.'],
 ['mo-f05','F','Đường Chạy Bình Minh','thể thao','Giúp đội chạy vượt qua khủng hoảng.'],
 ['mo-e01','E','Bản Hợp Đồng Số 7','thương trường','Xác định điều khoản bị tráo trong thương vụ.'],
 ['mo-e02','E','Đèn Đỏ Phố Vắng','trinh thám đô thị','Ghép lại hành trình của một nhân chứng.'],
 ['mo-e03','E','Quán Cà Phê Khởi Nghiệp','kinh doanh','Cứu cửa hàng khỏi một chuỗi quyết định sai.']
 ],
 era:[
 ['er-f01','F','Phiếu Gạo Cuối Tháng','đời sống bao cấp','Tìm cách phân phối nhu yếu phẩm công bằng.'],
 ['er-f02','F','Sân Ga Năm Ấy','hoài niệm','Lần tìm chủ nhân chiếc vali thất lạc.'],
 ['er-f03','F','Xưởng Dệt Ban Mai','lao động','Khôi phục vận hành một dây chuyền nhỏ.'],
 ['er-f04','F','Mùa Lúa Hợp Tác','nông thôn','Gỡ hiểu lầm trong vụ thu hoạch chung.'],
 ['er-f05','F','Thư Gửi Từ Phương Xa','gia đình','Nối lại một cuộc liên lạc đứt quãng.'],
 ['er-e01','E','Chuyến Xe Đổi Mới','khởi nghiệp thời kỳ','Vận chuyển lô hàng qua nhiều trở ngại.'],
 ['er-e02','E','Bản Tin Máy Thu','bí ẩn lịch sử','Giải mã chuỗi tín hiệu phát thanh.'],
 ['er-e03','E','Phố Chợ Chuyển Mình','thương mại','Cân bằng quyền lợi trong phiên chợ lớn.']
 ],
 future:[
 ['fu-f01','F','Lớp Học Trọng Lực','học viện vũ trụ','Vượt qua bài thử nghiệm trọng lực mô phỏng.'],
 ['fu-f02','F','Người Máy Số Không','AI đồng hành','Khôi phục ký ức một robot phục vụ.'],
 ['fu-f03','F','Vườn Sinh Học Sao Mộc','sinh thái','Ổn định khu nhà kính ngoài không gian.'],
 ['fu-f04','F','Phố Neon Tầng Dưới','cyberpunk','Lần theo kiện hàng thất lạc trong thành phố tầng.'],
 ['fu-f05','F','Phòng Trò Chơi Thực Tại','thế giới ảo','Tìm đường thoát một mô phỏng lỗi.'],
 ['fu-e01','E','Vòng Lặp Thứ Chín','du hành thời gian','Tìm điểm mốc phá một ngày lặp lại.'],
 ['fu-e02','E','Ga Chuyển Quỹ Đạo','thám hiểm vũ trụ','Điều phối đợt sơ tán khỏi trạm trung chuyển.'],
 ['fu-e03','E','Bản Sao Không Tên','đạo đức AI','Truy nguyên danh tính giữa những bản ghi mâu thuẫn.']
 ],
 cultivation:[
 ['cu-f01','F','Nhập Môn Thanh Vân','tông môn','Hoàn thành lễ thử tư chất sơ cấp.'],
 ['cu-f02','F','Linh Điền Sau Núi','linh thực','Cứu vườn linh thảo khỏi một loại sâu lạ.'],
 ['cu-f03','F','Phù Lục Sai Nét','phù thuật','Sửa chuỗi phù văn mất ổn định.'],
 ['cu-f04','F','Linh Thú Thất Lạc','ngự thú','Tìm linh thú non trong rừng cấm ngoài.'],
 ['cu-f05','F','Chợ Phiên Tu Sĩ','giao dịch','Đối chiếu một món pháp khí không rõ nguồn.'],
 ['cu-e01','E','Bí Cảnh Tiểu Môn','bí cảnh','Vượt trận pháp ba tầng để lấy tín vật.'],
 ['cu-e02','E','Đan Phòng Đêm Trăng','luyện đan','Tìm sai lệch trong một phương thuốc cũ.'],
 ['cu-e03','E','Khách Qua Cổ Kiều','tán tu','Hộ tống người lạ qua địa giới tranh chấp.']
 ],
 apocalypse:[
 ['ap-f01','F','Trạm Trú Ẩn 03','sinh tồn','Ổn định điện nước cho khu trú ẩn nhỏ.'],
 ['ap-f02','F','Mưa Đen Đầu Mùa','biến dị thời tiết','Tìm nguồn nước an toàn sau cơn mưa lạ.'],
 ['ap-f03','F','Thành Phố Ngủ Đông','băng giá','Phục hồi bộ phận sưởi cho nhóm dân cư.'],
 ['ap-f04','F','Khu Vườn Trong Tường','tái thiết','Gieo trồng trước khi nguồn dự trữ cạn.'],
 ['ap-f05','F','Cát Đỏ Ngoài Cổng','hoang mạc hóa','Khảo sát lối đi an toàn giữa các trạm.'],
 ['ap-e01','E','Tín Hiệu Thành Phố Cũ','điều tra hậu tận thế','Xác nhận người phát đi tín hiệu cầu cứu.'],
 ['ap-e02','E','Đoàn Xe Vượt Vành Đai','hộ tống','Dẫn đoàn xe qua vùng thú biến dị.'],
 ['ap-e03','E','Đêm Canh Khu Cách Ly','dịch biến','Xác định nguồn lây trước khi khu trú ẩn bị phong tỏa.']
 ]
};
const gateMap=Object.freeze(genres.map(g=>Object.freeze({
 ...g,categoryId:'dudu-g-'+g.genreId,type:'genre',status:'catalog_only'
})));
const missions=Object.freeze(genres.flatMap(g=>(collections[g.genreId]||[]).map(row=>Object.freeze({
 missionId:'dudu-m-'+row[0],genreId:g.genreId,tier:row[1],name:row[2],
 subgenre:row[3],premise:row[4],status:'seed',scenarioId:null,storyId:null,
 storyPromptId:null,npcIds:Object.freeze([]),available:false
}))));
const byGenre=genreId=>missions.filter(m=>m.genreId===genreId);
function pickPreview({genreId=null,tier='F',seenMissionIds=[],recentGenreIds=[],random=Math.random}={}){
 const permitted=missions.filter(m=>(!genreId||m.genreId===genreId)&&m.tier===tier);
 if(!permitted.length)return null;
 const seen=new Set(Array.isArray(seenMissionIds)?seenMissionIds:[]);
 let pool=permitted.filter(m=>!seen.has(m.missionId));
 // If all missions of this tier have been seen, one rotation can begin again.
 if(!pool.length)pool=permitted;
 const recent=new Set(Array.isArray(recentGenreIds)?recentGenreIds.slice(-2):[]);
 const diverse=pool.filter(m=>!recent.has(m.genreId));
 if(diverse.length)pool=diverse;
 const n=Number(random());const index=Math.min(pool.length-1,Math.max(0,Math.floor((Number.isFinite(n)?n:0)*pool.length)));
 return pool[index];
}
function entryCheck({pactVerified=false,authorizedMissionTiers=[],missionId=null,scenarioPublished=false}={}){
 if(pactVerified!==true)return Object.freeze({allowed:false,reason:'pact_required'});
 const mission=missions.find(m=>m.missionId===missionId);
 if(!mission)return Object.freeze({allowed:false,reason:'unknown_mission'});
 // System rank and mission grade are different concepts. The real server computes
 // eligible F/E tiers from signed pact and progression, never the browser.
 if(!Array.isArray(authorizedMissionTiers)||!authorizedMissionTiers.includes(mission.tier))
   return Object.freeze({allowed:false,reason:'rank_locked'});
 if(mission.status!=='published'||mission.available!==true||scenarioPublished!==true)
   return Object.freeze({allowed:false,reason:'scenario_unpublished'});
 return Object.freeze({allowed:false,reason:'server_authorization_required'});
}
window.DuduWorldTaxonomyV66=Object.freeze({
 version:1,genres:gateMap,missions,tiers:Object.freeze(['F','E']),
 contractPolicy:Object.freeze({required:true,verifiedByServer:true,
   starterMissionTiers:Object.freeze(['F','E']),promotionServerControlled:true}),
 byGenre,pickPreview,entryCheck
});
})();