import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./authContext";
import api from "../utils/api";

const BlogContext = createContext();

export const BlogProvider = ({ children }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

const fetchBlogs = useCallback(async () => {
    if (blogs.length > 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res =  await api("get","api/blogs/");
      const data = res.data;
      setBlogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [blogs.length]);


 const fetchBlog=async(id)=>{
try {
  
     const res=await api("get",`api/blogs/${id}/`);
     const data=res.data;
        console.log(data);
       
  } catch (error) {
     console.error(error);
    
  }
  };
  // useEffect(() => {
  //   fetchBlogs();
  // }, [fetchBlogs]);

  const addBlog = async (title, blogtext) => {
    try {
   
      const res=await api("post","api/blogs/",{
        title,blogtext, U_ID: user?.id 
      })
      await fetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUpvote = async (blogId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/blogs/${blogId}/upvote/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ U_ID: user?.id }),
      });
      const data = await res.json();
      setBlogs((prev) =>
        prev.map((b) =>
          b.id === blogId ? { ...b, upvote_count: data.upvote_count } : b
        )
      );
      return data;
    } catch (err) {
      console.error(err);
    }
  };

  const addComment = async (blogId, commentText) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/blogs/${blogId}/comment/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: commentText, U_ID: user?.id }),
      });
      await fetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };

  const getBlogById = (id) => blogs.find((b) => b.id === parseInt(id));

  return (
    <BlogContext.Provider
      value={{
        blogs,
        setBlogs,
        loading,
        setLoading,
        addBlog,
        toggleUpvote,
        addComment,
        getBlogById,
        myBlogs: blogs.filter((b) => b.U_ID === user?.id),
      }}
    >
      {children}
    </BlogContext.Provider>
  );
};

export const useBlog = () => useContext(BlogContext);