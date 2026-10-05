import { getLeaderboard } from "../game/leaderboard";
export default function Leaderboard({ players }) {
  const ranking = getLeaderboard(players);
  return (
    <section className="panel leaderboard">
      <div className="section-heading">
        <h2>Top điểm làm chủ AI</h2>
        <span>{ranking.length} người hoàn thành</span>
      </div>
      <p className="ranking-note">
        Chỉ xếp hạng người đã hoàn thành. Bằng điểm: người hoàn thành sớm hơn
        đứng trước.
      </p>
      {!ranking.length ? (
        <p className="empty">
          Kết quả sẽ tự xuất hiện khi có người hoàn thành hành trình.
        </p>
      ) : (
        <div className="ranking-scroll">
          <table>
            <caption className="sr-only">Bảng điểm người đã hoàn thành</caption>
            <thead>
              <tr>
                <th scope="col">Hạng</th>
                <th scope="col">Người chơi</th>
                <th scope="col">Điểm làm chủ AI</th>
                <th scope="col">Tự lực</th>
                <th scope="col">Trách nhiệm</th>
                <th scope="col">Nhân ái</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((player, index) => (
                <tr key={player.uid} className={index < 3 ? "top-rank" : ""}>
                  <td>
                    <span className="rank-number">{index + 1}</span>
                  </td>
                  <th scope="row">{player.name}</th>
                  <td>
                    <strong>{player.finalScore}</strong>
                  </td>
                  <td>{player.stats?.tuLuc ?? "—"}</td>
                  <td>{player.stats?.trachNhiem ?? "—"}</td>
                  <td>{player.stats?.nhanAi ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="ranking-note">
        Điểm phản ánh lựa chọn trong game, không đánh giá nhân cách. Hiệu suất
        không tính vào điểm tổng.
      </p>
    </section>
  );
}
