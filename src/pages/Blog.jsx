import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/authContext";
import { useBlog } from "../context/blogContext";
import api from "../utils/api";
export default function Blog() {
  
  const [loading, setLoading] = useState(true);
  const {blogs, setBlogs} =useBlog();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [blogtext, setBlogtext] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // ← new
  const navigate = useNavigate();
  const { user } = useAuth();
// console.log("USER:", user);
console.log(blogs);
  const fetchBlogs = async() => {
    try {
      const res=await api("get","api/blogs/");
      console.log("res:",res);
      const data=res.data;
    setBlogs(data);
        setLoading(false);
    } catch (error) {
       console.error(error);
        setLoading(false);
    }
  };

  useEffect(() => {
    // if(blogs.length>0) setLoading(false);
    fetchBlogs();
  }, []);

  const handleSubmit = async () => {
    if (!title || !blogtext) return;
    setSubmitting(true);
    try {
      await fetch("http://127.0.0.1:8000/api/blogs/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          blogtext,
          U_ID: user?.U_ID || user?.id || 1,
        }),
      });
      setTitle("");
      setBlogtext("");
      setShowModal(false);
      fetchBlogs();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const filteredBlogs = blogs
    .filter((b) => {
      if (activeTab === "mine") return b.U_ID === (user?.U_ID || user?.id);
      return true;
    })
    .filter((b) => b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Sidebar>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .anim-1 { animation: fadeUp 0.4s ease 0.05s both; }
        .anim-2 { animation: fadeUp 0.4s ease 0.12s both; }
        .anim-3 { animation: fadeUp 0.4s ease 0.20s both; }
      `}</style>

      {/* Header */}
      <div className="anim-1 flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900 tracking-tight">
            Interview Experiences
          </h1>
          <p className="text-zinc-400 text-sm mt-1 font-light">
            Real stories from real job seekers 📝
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition-all font-medium"
        >
          + Write Blog
        </button>
      </div>

      {/* Search + Tabs */}
      <div className="anim-1 flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">⌕</span>
          <input
            type="text"
            placeholder="Search blogs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 w-full transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-1">
          {["all", "mine"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-all
                ${activeTab === tab
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-white"
                }`}
            >
              {tab === "all" ? "All Blogs" : "My Blogs"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-zinc-100 rounded w-2/3 mb-3" />
              <div className="h-3 bg-zinc-100 rounded w-full mb-2" />
              <div className="h-3 bg-zinc-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Blog Cards */}
      {!loading && (
        <div className="anim-2 grid grid-cols-1 gap-4">
          {filteredBlogs.length === 0 && (
            <div className="text-center py-20 text-zinc-400">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm font-medium text-zinc-500">
                {activeTab === "mine" ? "You haven't written any blogs yet" : "No blogs found"}
              </p>
              <p className="text-xs mt-1">
                {activeTab === "mine" ? "Click '+ Write Blog' to share your experience!" : "Be the first to share!"}
              </p>
            </div>
          )}

          {filteredBlogs.map((blog) => (
            <div
              key={blog.id}
              onClick={() => navigate(`/blog/${blog.id}`)}
              className="anim-3 cursor-pointer bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="font-display text-xl font-bold text-zinc-900 mb-2 tracking-tight">
                    {blog.title}
                  </h2>
                  <p className="text-zinc-500 text-sm font-light leading-relaxed line-clamp-2">
                    {blog.blogtext}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
                      Interview Experience
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ✍ {blog.uname || `User #${blog.U_ID}`}
                    </span>
                    {/* Upvote count */}
                    <span className="text-[11px] text-zinc-400">
                      ▲ {blog.upvote_count || 0}
                    </span>
                    {/* Comment count */}
                    <span className="text-[11px] text-zinc-400">
                      💬 {blog.comments?.length || 0}
                    </span>
                    <span className="text-blue-500 text-[11px] font-medium ml-auto">
                      Read more →
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-lg ml-4 flex-shrink-0">
                  📄
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Blog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl border border-zinc-200">
            <h3 className="font-display font-bold text-xl text-zinc-900 mb-1 tracking-tight">
              Write Your Experience
            </h3>
            <p className="text-zinc-400 text-sm font-light mb-6">
              Share your interview story with the community
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Title</label>
              <input
                type="text"
                placeholder="e.g. My Google Interview Experience"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 transition-all"
              />
            </div>
            <div className="mb-6">
              <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Your Experience</label>
              <textarea
                rows={5}
                placeholder="Share your interview experience in detail..."
                value={blogtext}
                onChange={(e) => setBlogtext(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 transition-all resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 text-sm border border-zinc-200 text-zinc-700 py-2.5 rounded-xl hover:border-zinc-400 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 text-sm bg-zinc-900 text-white py-2.5 rounded-xl hover:bg-zinc-700 transition-all font-medium shadow-sm disabled:opacity-50"
              >
                {submitting ? "Publishing..." : "Publish Blog"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}