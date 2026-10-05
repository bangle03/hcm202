export default function VoteProgress({ voted, eligible }) {
  return <p className="community-progress" role="status"><strong>{voted} / {eligible}</strong> người đã đưa ra quyết định</p>;
}
