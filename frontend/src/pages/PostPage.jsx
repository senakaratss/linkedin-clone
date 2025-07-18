import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useParams } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import Post from "../components/Post";

const PostPage = () => {
  const { postId } = useParams();

  const { data: authUser } = useQuery({ queryKey: ["authUser"] });

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => axiosInstance.get(`/posts/${postId}`),
  });
  if (isLoading) return <div>Loading...</div>;
  if (!post?.data) return <div>Post not found</div>;

  //todo: make the post reactions work in the post page
  return (
    <div className="grid grid-cols lg:grid-cols-4 gap-6">
      <div className="col-span-1 lg:col-span-1">
        <Sidebar user={authUser} />
      </div>
      <div className="col-span-1 lg:col-span-3">
        <Post post={post.data} />
      </div>
    </div>
  );
};

export default PostPage;
