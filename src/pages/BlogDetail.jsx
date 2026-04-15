import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/authContext";
import { useBlog } from "../context/blogContext";
import api from "../utils/api";
export default function BlogDetail() {
  const {id}=useParams();
//  const {blogs}=useBlog();
const [blog,setBlog]=useState();
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
useEffect(()=>{
const fetchBlog = async() => {
  try {
  
     const res=await api("get",`api/blogs/${id}/`);
     const data=res.data;
        console.log(data);
        setBlog(data);
        setUpvoteCount(data.upvote_count || 0);
        setUpvoted(data.is_upvoted);
        setLoading(false);
  } catch (error) {
     console.error(error);
        setLoading(false);
  }
  };
  fetchBlog();
},[])
  

  // useEffect(() => {
  //   fetchBlog();
  // }, [id]);
//   useEffect(() => {
//   if (blogs.length > 0) {
//     setLoading(false);
//   }
// }, [blogs]);
// const blog=blogs.find(b => b.id == id);
  const handleUpvote = async () => {
    try {
       const res = await api("post",`api/blogs/${id}/upvote/`);
    const data = res.data;
    setUpvoted(data.upvoted);
    setUpvoteCount(data.upvote_count);
    } catch (error) {
      console.log(error);
    }
   

  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    await fetch(`http://127.0.0.1:8000/api/blogs/${id}/comment/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment_text: comment,
        U_ID: user?.U_ID || user?.id || 1,
      }),
    });
    setComment("");
    setSubmitting(false);
    fetchBlog();
  };

  return (
    <Sidebar>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .anim-1 { animation: fadeUp 0.4s ease 0.05s both; }
        .anim-2 { animation: fadeUp 0.4s ease 0.12s both; }
        .anim-3 { animation: fadeUp 0.4s ease 0.28s both; }
      `}</style>

      {/* Back button */}
      <div className="anim-1 mb-6">
        <button
          onClick={() => navigate("/blog")}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
        >
          ← Back to Blogs
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 animate-pulse">
          <div className="h-6 bg-zinc-100 rounded w-2/3 mb-4" />
          <div className="h-4 bg-zinc-100 rounded w-full mb-2" />
          <div className="h-4 bg-zinc-100 rounded w-5/6" />
        </div>
      )}

      {!loading && blog && (
        <>
          {/* Blog Content */}
          <div className="anim-2 bg-white border border-zinc-200 rounded-2xl p-8 mb-6">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 mb-4 inline-block">
              Interview Experience
            </span>

            <h1 className="font-display text-3xl font-bold text-zinc-900 tracking-tight mt-3 mb-2">
              {blog.title}
            </h1>

            {/* Meta + Upvote */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
                  {blog.uname?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="text-sm text-zinc-500 font-medium">
                  {blog.uname || `User #${blog.U_ID}`}
                </span>
              </div>

              {/* Upvote button */}
              <button
                onClick={handleUpvote}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium
                  ${upvoted
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                  }`}
              >
                ▲ {upvoteCount} {upvoted ? "Upvoted" : "Upvote"}
              </button>
            </div>

            {/* Blog text */}
            <p className="text-zinc-700 leading-relaxed text-base font-light whitespace-pre-line">
              {blog.blogtext}
            </p>
          </div>

          {/* Comments Section */}
          <div className="anim-3 bg-white border border-zinc-200 rounded-2xl p-8">
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-6">
              Comments ({blog.comments?.length || 0})
            </h2>

            {/* Comment Input */}
            <div className="mb-6">
              <textarea
                rows={3}
                placeholder="Share your thoughts..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 transition-all resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleComment}
                  disabled={submitting || !comment.trim()}
                  className="text-sm bg-zinc-900 text-white px-5 py-2 rounded-lg hover:bg-zinc-700 transition-all font-medium disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {blog.comments?.length === 0 && (
                <div className="text-center py-8 text-zinc-400">
                  <p className="text-sm">No comments yet — be the first! 💬</p>
                </div>
              )}

              {blog.comments?.map((c) => (
                <div key={c.id} className="flex gap-3 p-4 bg-zinc-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0">
                    {c.uname?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-zinc-900">
                        {c.uname || `User #${c.U_ID}`}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 font-light">{c.comment_text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Not found */}
      {!loading && !blog && (
        <div className="text-center py-20 text-zinc-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-medium text-zinc-500">Blog not found</p>
        </div>
      )}
    </Sidebar>
  );
}