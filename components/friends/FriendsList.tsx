import { useState, useEffect } from 'react';
import { useSocialMesh } from '@/hooks/useSocialMesh';
import { Avatar } from '@/components/common';

export function FriendsList() {
  const { 
    userId, 
    friends = [], 
    friendRequests = [], 
    sentRequests = [],
    sendFriendRequest, 
    acceptFriendRequest,
    loadFriendRequests, 
    loadSentRequests, 
    isFriendOrPending,
    fetchUserProfile,
    checkUserExists,
  } = useSocialMesh();

  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadFriendRequests();
      loadSentRequests();
    }
  }, [userId]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fullId = await checkUserExists(searchInput);
      if (!fullId) {
        setSearchResult(null);
        setError('User not found');
        setLoading(false);
        return;
      }
      const profile = await fetchUserProfile(fullId);
      if (profile && profile.name) {
        setSearchResult({ userId: fullId, profile });
      } else {
        setSearchResult({ userId: fullId, profile: { name: 'User' } });
      }
    } catch (e) {
      console.error(e);
      setError('Error searching user');
    }
    setLoading(false);
  };

  const status = searchResult ? isFriendOrPending?.(searchResult.userId) || 'none' : 'none';

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold mb-4">Friends</h2>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter full or partial User ID"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-400"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      {searchResult && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={searchResult.userId} size="sm" />
            <span>{searchResult.userId.slice(0, 8)}</span>
          </div>
          {status === 'friend' ? (
            <span className="text-green-500 font-semibold">Friend</span>
          ) : status === 'pending' ? (
            <span className="text-yellow-500 font-semibold">Pending</span>
          ) : (
            <button
              onClick={() => sendFriendRequest?.(searchResult.userId)}
              className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm"
            >
              Add Friend
            </button>
          )}
        </div>
      )}

      <hr className="my-4" />

      <h3 className="font-semibold">Your Friends</h3>
      {!friends || friends.length === 0 ? (
        <p className="text-gray-500">No friends yet</p>
      ) : (
        <div className="space-y-2">
          {friends.map((fid: string) => (
            <div key={fid} className="flex items-center gap-3">
              <Avatar name={fid} size="sm" />
              <span>{fid.slice(0, 8)}</span>
            </div>
          ))}
        </div>
      )}

      <hr className="my-4" />

      <h3 className="font-semibold">Incoming Friend Requests</h3>
      {!friendRequests || friendRequests.length === 0 ? (
        <p className="text-gray-500">No pending requests</p>
      ) : (
        friendRequests.map((req: any) => (
          <div key={req.activity_id} className="flex items-center justify-between py-2">
            <span>From: {req.author_id?.slice(0, 8) || 'Unknown'}</span>
            <button
              onClick={() => acceptFriendRequest?.(req.activity_id, req.author_id)}
              className="bg-green-500 text-white px-3 py-1 rounded-full text-sm"
            >
              Accept
            </button>
          </div>
        ))
      )}

      <hr className="my-4" />

      <h3 className="font-semibold">Sent Requests</h3>
      {!sentRequests || sentRequests.length === 0 ? (
        <p className="text-gray-500">No sent requests</p>
      ) : (
        sentRequests.map((req: any) => (
          <div key={req.activity_id} className="flex items-center justify-between py-2">
            <span>To: {req.parent_id?.slice(0, 8) || 'Unknown'}</span>
            <span className="text-yellow-500 text-sm">Pending</span>
          </div>
        ))
      )}
    </div>
  );
}
