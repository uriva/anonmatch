import { useEffect, useState } from "preact/hooks";

import { Head } from "$fresh/runtime.ts";
import nostrTools from "npm:nostr-tools";

const getPublicKey = nostrTools.getPublicKy;
const uuid = () => crypto.randomUUID();

type PublicKey = string;
type SecretKey = string;

type AppEvent = ChatMessage | Decision | LikeAck | ChatAck | Profile | Match;
type ChatMessage = {
  type: "chat";
  text: string;
  sender: PublicKey;
  recipient: PublicKey;
  timestamp: number;
  id: string;
};
type Decision = {
  type: "decision";
  target: PublicKey;
  like: boolean;
  timestamp: number;
  id: string;
};
type LikeAck = {
  type: "decision-ack";
  acking: string;
  timestamp: number;
  id: string;
};
type ChatAck = {
  type: "chat-ack";
  acking: string;
  timestamp: number;
  id: string;
};
type Profile = {
  type: "profile";
  publicKey: PublicKey;
  name: string;
  description: string;
  timestamp: number;
  id: string;
};
type Match = {
  type: "match";
  peer: PublicKey;
  timestamp: number;
  id: string;
};

const getTimestamp = (): number => new Date().getTime();

const chooseNextProfile = (events: AppEvent[]): Profile | null => {
  const decisions = events.filter(
    ({ type }) => type === "decision",
  ) as Decision[];
  const profilesDecidedOn = new Set(decisions.map(({ target }) => target));
  const profiles = events.filter(({ type }) => type === "profile") as Profile[];
  return (
    profiles.find(({ publicKey }) => !profilesDecidedOn.has(publicKey)) || null
  );
};

const ProfileComponent = ({
  profile: { name, description, timestamp },
  like,
  unlike,
}: {
  profile: Profile;
  like: () => void;
  unlike: () => void;
}) => {
  return (
    <div>
      name: {name}
      description: {description}
      last updated: {timestamp}
      <button onClick={like}>like</button>
      <button onClick={unlike}>unlike</button>
    </div>
  );
};

const Matches = ({
  events,
  setChatPeer,
}: {
  events: AppEvent[];
  setChatPeer: (peer: PublicKey) => void;
}) => {
  const matches = events.filter(({ type }) => type === "match") as Match[];
  return (
    <div>
      <h2>Matches</h2>
      {matches.map(({ peer }, id) => (
        <button key={id} onClick={() => setChatPeer(peer)}>
          {peer}
        </button>
      ))}
    </div>
  );
};

// const useExternal = (f) => {
// console.error("not yet implemented");
// };

const profileToDecision = (
  { publicKey }: Profile,
  decision: boolean,
): Decision => ({
  type: "decision",
  timestamp: getTimestamp(),
  target: publicKey,
  like: decision,
  id: uuid(),
});

const Chat = ({
  peer,
  events,
  sendChat,
}: {
  sendChat: (text: string, peer: PublicKey) => void;
  peer: PublicKey;
  events: AppEvent[];
}) => {
  const [text, setText] = useState("");
  const chats = events.filter(
    (event) =>
      event.type === "chat" &&
      (event.sender === peer || event.recipient === peer),
  ) as ChatMessage[];
  return (
    <div>
      <h2>Chat</h2>
      {chats
        .sort((x, y) => x.timestamp - y.timestamp)
        .map(({ sender, text, timestamp }: ChatMessage) => (
          <div>
            {sender} said {text} at {timestamp}
          </div>
        ))}
      <input
        value={text}
        onChange={(e) => setText((e.target as HTMLInputElement).value)}
      />
      <button
        onClick={() => {
          sendChat(text, peer);
        }}
      >
        send
      </button>
    </div>
  );
};

const makeProfile = (
  publicKey: PublicKey,
  name: string,
  description: string,
): Profile => ({
  type: "profile",
  description,
  name,
  id: uuid(),
  publicKey,
  timestamp: getTimestamp(),
});

const EditMyProfile = ({
  saveProfile,
}: {
  saveProfile: (name: string, description: string) => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <div>
      name:
      <input
        type="text"
        value={name}
        onChange={(e) => setName((e.target as HTMLInputElement).value)}
      />
      description:
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
      />
      <button onClick={() => saveProfile(name, description)}>Save</button>
    </div>
  );
};

const makeChatEvent = (
  sender: PublicKey,
  text: string,
  recipient: PublicKey,
): ChatMessage => ({
  type: "chat",
  timestamp: getTimestamp(),
  id: uuid(),
  text,
  recipient,
  sender,
});
export default function Home() {
  const secretKey = "asd";
  const [events, setEvents] = useState<AppEvent[]>([]);
  // const [tasks, setTasks] = useState([]);

  // useExternal((handler) => {
  //   anonMatchRgisterHandler(secretKey, (e: ChatMessage | Profile) => {
  //     addEvent(e);
  //   });
  // });

  // useEffect(() => {}, [tasks]);
  const addEvent = (event: AppEvent) => {
    // TODO: talk to anonmatch api to register the event externally
    setEvents([...events, event]);
  };
  const profile = chooseNextProfile(events);
  const [chatPeer, setChatPeer] = useState<PublicKey | null>(null);
  return (
    <>
      <Head>
        <title>PeerMatch</title>
      </Head>
      <Matches
        events={events}
        setChatPeer={(peer: PublicKey) => {
          setChatPeer(peer);
        }}
      />
      <EditMyProfile
        saveProfile={(name: string, description: string) => {
          setEvents([
            ...events,
            makeProfile(getPublicKey(secretKey), name, description),
          ]);
        }}
      />
      {profile && (
        <ProfileComponent
          like={() => {
            addEvent(profileToDecision(profile, true));
          }}
          unlike={() => {
            addEvent(profileToDecision(profile, false));
          }}
          profile={profile}
        />
      )}
      {chatPeer && (
        <Chat
          peer={chatPeer}
          sendChat={(text: string, recipient: PublicKey) => {
            addEvent(makeChatEvent(getPublicKey(secretKey), text, recipient));
          }}
          events={events}
        />
      )}
    </>
  );
}
