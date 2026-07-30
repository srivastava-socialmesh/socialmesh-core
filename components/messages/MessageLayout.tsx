import { Avatar } from '@/components/common';
import { Send, Phone, Video } from 'lucide-react';

interface MessageLayoutProps {
  contacts: string[];
  selectedContact: string | null;
  messages: { [contact: string]: any[] };
  userId: string;
  dmInput: string;
  setDmInput: (val: string) => void;
  sendDM: (contact: string, text: string) => void;
  requestDMHistory: (contact: string) => void;
  setSelectedContact: (contact: string) => void;
  startCall: () => void;
  startListen: () => void;
  targetId: string;
  setTargetId: (id: string) => void;
  connected: boolean;
  defaultPeer: string;
  saveDefaultPeer: (peerId: string) => void;
}

export function MessageLayout({
  contacts,
  selectedContact,
  messages,
  userId,
  dmInput,
  setDmInput,
  sendDM,
  requestDMHistory,
  setSelectedContact,
  startCall,
  startListen,
  targetId,
  setTargetId,
  connected,
  defaultPeer,
  saveDefaultPeer,
}: MessageLayoutProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 h-[650px] flex flex-col">
      <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800">Messages</h2>
        <div className="flex gap-2 items-center">
          <input
            placeholder="Connect to peer ID"
            className="border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-400 w-48"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
          <button onClick={startCall} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition shadow">Call</button>
          <button onClick={startListen} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition shadow">Listen</button>
          <button
            onClick={() => {
              if (targetId) {
                saveDefaultPeer(targetId);
                alert('Default peer set!');
              }
            }}
            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-full text-sm font-semibold transition shadow"
            title="Save current target as default peer"
          >
            ⭐
          </button>
        </div>
        {connected && <span className="text-green-500 text-sm font-medium">● Connected</span>}
        {defaultPeer && !connected && (
          <span className="text-blue-500 text-xs">Default: {defaultPeer.slice(0,6)}</span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-gray-50">
          <div className="p-4 font-bold text-gray-700 border-b border-gray-200">Contacts</div>
          {contacts.length === 0 ? (
            <div className="p-6 text-gray-400 text-center">No contacts yet<br/>Connect to a peer to start chatting</div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact}
                className={`p-4 cursor-pointer hover:bg-gray-100 transition flex items-center gap-4 border-b border-gray-100 ${
                  selectedContact === contact ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => {
                  setSelectedContact(contact);
                  requestDMHistory(contact);
                }}
              >
                <Avatar name={contact} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800">{contact.slice(0, 8)}</div>
                  <div className="text-sm text-gray-400 truncate">
                    {(messages[contact]?.length || 0) > 0
                      ? messages[contact]?.[messages[contact].length - 1]?.text
                      : 'No messages'}
                  </div>
                </div>
                {contact === targetId && connected && (
                  <span className="text-green-500 text-xs">● Online</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex-1 flex flex-col bg-white">
          {selectedContact ? (
            <>
              <div className="p-4 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-3 bg-gray-50">
                <Avatar name={selectedContact} size="md" />
                {selectedContact.slice(0, 8)}
                <div className="ml-auto flex gap-2">
                  <button className="p-2 rounded-full hover:bg-gray-200 transition"><Phone className="w-4 h-4" /></button>
                  <button className="p-2 rounded-full hover:bg-gray-200 transition"><Video className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {(messages[selectedContact] || []).map((dm, idx) => (
                  <div
                    key={idx}
                    className={`flex ${dm.sender === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-5 py-3 text-base shadow-md ${
                        dm.sender === userId
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {dm.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 bg-white flex gap-3">
                <input
                  className="flex-1 border border-gray-300 rounded-full px-5 py-3 focus:ring-2 focus:ring-blue-400 text-base"
                  placeholder="Type a message..."
                  value={dmInput}
                  onChange={(e) => setDmInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendDM(selectedContact, dmInput)}
                />
                <button
                  onClick={() => sendDM(selectedContact, dmInput)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full text-base font-semibold transition shadow"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              {connected ? 'Select a contact to start chatting' : 'Connect to a peer to start messaging'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
