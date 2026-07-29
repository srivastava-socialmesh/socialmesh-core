import { useState, useEffect } from 'react';
import { useSocialMesh } from '@/hooks/useSocialMesh';
import { Avatar } from '@/components/common';
import { getContent } from '@/lib/storage';

export function FriendsList() {
  const { userId, friends, friendRequests, sendFriendRequest, acceptFriendRequest, loadFriendRequests } = useSocialMesh();

  useEffect(() => {
    if (userId) loadFriendRequests();
  }, [userId]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold mb-4">Friends</h2>
      {friends.length === 0 && <p className="text-gray-500">No friends yet. Send a friend request!</p>}
      <div className="space-y-2">
        {friends.map(fid => (
          <div key={fid} className="flex items-center gap-3">
            <Avatar name={fid} size="sm" />
            <span>{fid.slice(0, 8)}</span>
          </div>
        ))}
      </div>
      <hr className="my-4" />
      <h3 className="font-semibold">Friend Requests</h3>
      {friendRequests.length === 0 && <p className="text-gray-500">No pending requests</p>}
      {friendRequests.map((req: any) => {
        const content = getContent(req.activity_id);
        return (
          <div key={req.activity_id} className="flex items-center justify-between py-2">
            <span>From: {req.author_id.slice(0, 8)}</span>
            <button
              onClick={() => acceptFriendRequest(req.activity_id, req.author_id)}
              className="bg-green-500 text-white px-3 py-1 rounded-full text-sm"
            >
              Accept
            </button>
          </div>
        );
      })}
    </div>
  );
}
