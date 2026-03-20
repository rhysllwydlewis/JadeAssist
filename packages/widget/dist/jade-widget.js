(function(p){"use strict";const u={apiBaseUrl:"",authToken:"",assistantName:"Jade",greetingText:"Hi! 👋 I'm Jade, your event planning assistant. Can I help you plan your special day?",greetingTooltipText:"👋 Hi! Need help planning your event?",avatarUrl:"https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/assets/avatar-woman.png",primaryColor:"#0B8073",accentColor:"#13B6A2",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',showDelayMs:1e3,offsetBottom:"80px",offsetRight:"24px",offsetLeft:"",offsetBottomMobile:"",offsetRightMobile:"",offsetLeftMobile:"",scale:1,debug:!1},l={STATE:"jade-widget-state",MESSAGES:"jade-widget-messages",CONVERSATION_ID:"jade-widget-conversation-id",GREETING_DISMISSED:"jade-widget-greeting-dismissed"};class r{static saveState(e){try{const s={...this.loadState(),...e};localStorage.setItem(l.STATE,JSON.stringify(s))}catch(t){console.warn("Failed to save widget state:",t)}}static loadState(){try{const e=localStorage.getItem(l.STATE);return e?JSON.parse(e):{}}catch(e){return console.warn("Failed to load widget state:",e),{}}}static saveMessages(e){try{localStorage.setItem(l.MESSAGES,JSON.stringify(e))}catch(t){console.warn("Failed to save messages:",t)}}static loadMessages(){try{const e=localStorage.getItem(l.MESSAGES);return e?JSON.parse(e):[]}catch(e){return console.warn("Failed to load messages:",e),[]}}static saveConversationId(e){try{localStorage.setItem(l.CONVERSATION_ID,e)}catch(t){console.warn("Failed to save conversation ID:",t)}}static loadConversationId(){try{return localStorage.getItem(l.CONVERSATION_ID)}catch(e){return console.warn("Failed to load conversation ID:",e),null}}static clearAll(){try{localStorage.removeItem(l.STATE),localStorage.removeItem(l.MESSAGES),localStorage.removeItem(l.CONVERSATION_ID),localStorage.removeItem(l.GREETING_DISMISSED)}catch(e){console.warn("Failed to clear storage:",e)}}static isGreetingDismissed(){try{return localStorage.getItem(l.GREETING_DISMISSED)==="true"}catch(e){return console.warn("Failed to check greeting dismissed state:",e),!1}}static setGreetingDismissed(){try{localStorage.setItem(l.GREETING_DISMISSED,"true")}catch(e){console.warn("Failed to save greeting dismissed state:",e)}}}class v{constructor(e,t){this.demoState={},this.baseUrl=e||"",this.authToken=t||"",this.demoMode=!e}async sendMessage(e,t){var n;if(this.demoMode)return this.mockResponse(e);const s={"Content-Type":"application/json"};this.authToken&&(s.Authorization=`Bearer ${this.authToken}`);const i=await fetch(`${this.baseUrl}/api/chat`,{method:"POST",headers:s,body:JSON.stringify({message:e,conversationId:t,userId:"anonymous"})});if(i.status===429)throw new Error("429: Rate limit exceeded. Please wait and try again.");if(i.status===401||i.status===403)throw new Error(`${i.status}: Authentication failed.`);if(!i.ok)throw new Error(`API error: ${i.status}`);const a=await i.json();if(!a.success||!a.data)throw new Error(((n=a.error)==null?void 0:n.message)||"API request failed");return{conversationId:a.data.conversationId,message:{id:a.data.message.id,role:"assistant",content:a.data.message.content,timestamp:Date.now(),quickReplies:a.data.suggestions}}}async mockResponse(e){await new Promise(n=>setTimeout(n,700+Math.random()*400));const t="demo-"+Date.now(),s=e.toLowerCase();this.updateDemoState(s);const{content:i,quickReplies:a}=this.buildDemoResponse(s);return{conversationId:t,message:{id:"msg-"+Date.now(),role:"assistant",content:i,timestamp:Date.now(),quickReplies:a}}}updateDemoState(e){e.includes("wedding")?this.demoState.eventType="wedding":e.includes("birthday")?this.demoState.eventType="birthday":e.includes("corporate")||e.includes("work event")?this.demoState.eventType="corporate":e.includes("party")?this.demoState.eventType="party":e.includes("anniversary")?this.demoState.eventType="anniversary":e.includes("conference")&&(this.demoState.eventType="conference"),/under\s*[£$]?5/.test(e)||/under\s*5k/i.test(e)?this.demoState.budget="under £5,000":/[£$]?50k|\b50,000/.test(e)?this.demoState.budget="£50,000+":/[£$]?20k|\b20,000/.test(e)?this.demoState.budget="£20,000–£50,000":/[£$]?10k|\b10,000/.test(e)?this.demoState.budget="£10,000–£20,000":/[£$]?5k|\b5,000/.test(e)&&(this.demoState.budget="£5,000–£10,000"),e.includes("london")?this.demoState.location="London":e.includes("scotland")?this.demoState.location="Scotland":e.includes("wales")?this.demoState.location="Wales":e.includes("north west")||e.includes("manchester")?this.demoState.location="North West":e.includes("south east")&&(this.demoState.location="South East")}buildDemoResponse(e){const t=this.demoState;return(e.includes("yes")&&e.includes("please")||e.includes("help")||e.includes("start")||e.includes("plan"))&&!t.eventType?{content:"I'd love to help you plan your event! What type of event are you organising? 🎉",quickReplies:["Wedding","Birthday Party","Corporate Event","Anniversary","Other"]}:e.includes("no")&&e.includes("thanks")?{content:"No problem at all! I'm here whenever you're ready to start planning. Feel free to come back any time. 😊"}:e.includes("wedding")||t.eventType==="wedding"?t.eventDate?t.guestCount?t.budget?{content:`Here's a suggested starting plan for your wedding:

**Immediate next steps:**
- Book your ceremony venue (venues book up 12–18 months in advance)
- Shortlist 3–5 reception venues in ${t.location||"your area"}
- Set your guest list to confirm headcount

**Budget guide (${t.budget||"your budget"}):**
- Venue: ~30%
- Catering & drinks: ~25%
- Photography & video: ~10%
- Flowers & décor: ~12%
- Music & entertainment: ~8%
- Everything else: ~15%

Would you like a detailed checklist or supplier recommendations?`,quickReplies:["See full checklist","Find venues","Budget breakdown","Set a timeline"]}:{content:"Good to know! What's your approximate total budget for the wedding? This helps me prioritise where to spend and where to save.",quickReplies:["Under £10k","£10k–£20k","£20k–£50k","£50k+"]}:{content:"Wonderful! How many guests are you expecting? This affects venue size, catering costs, and most supplier quotes.",quickReplies:["Under 30","30–80","80–150","150+"]}:{content:`Congratulations! A wedding is such a special occasion. 💍

To help you plan effectively, do you have a date or timeframe in mind?`,quickReplies:["This year","Next year","In 2+ years","Haven't decided yet"]}:e.includes("birthday")||t.eventType==="birthday"?t.guestCount?{content:`Great! Here are the key things to sort for a birthday party:

- **Venue**: For ${t.guestCount||"your guest count"} people, consider a private dining room, a hire venue, or a garden marquee
- **Catering**: Buffet or sit-down? This changes the cost significantly
- **Entertainment**: DJ, live band, or activities?
- **Date**: Book venue and catering at least 6–8 weeks ahead

What would you like to tackle first?`,quickReplies:["Find a venue","Catering options","Entertainment ideas","Set a budget"]}:{content:"A birthday party — fantastic! 🎂 How many guests are you expecting? That'll shape the venue and catering options.",quickReplies:["Intimate (under 20)","Small (20–50)","Medium (50–100)","Large (100+)"]}:e.includes("corporate")||t.eventType==="corporate"?{content:`Corporate events need to balance professionalism with engagement. A few questions to get you started:

- Is this a conference, team away-day, product launch, or something else?
- How many attendees?
- Do you have a preferred date or is it flexible?

Once I know those details I can suggest venues, AV suppliers, and catering options.`,quickReplies:["Conference","Away day","Product launch","Client dinner"]}:e.includes("anniversary")||t.eventType==="anniversary"?{content:`How lovely — an anniversary celebration! 🥂

To point you in the right direction:
- Is this an intimate dinner for two, or a party with family and friends?
- Do you have a location preference?`,quickReplies:["Intimate dinner","Small gathering","Large party","Surprise event"]}:e.includes("budget")||e.includes("cost")||e.includes("price")?{content:`Budget planning is one of the most important early steps for ${t.eventType||"your event"}. 💷

A few things to establish:
- What is your **total available budget**?
- Are there non-negotiables (e.g. specific venue, photographer)?
- Do you need to include honeymoon / travel costs?

Once I know your budget I can give you a realistic category breakdown.`,quickReplies:["Under £5k","£5k–£10k","£10k–£20k","£20k–£50k","£50k+"]}:e.includes("venue")?{content:`Venue is usually the first thing to lock in — it sets the date and shapes everything else. 📍

To find the right venue I need to know:
- **Region or city** — where are your guests travelling from?
- **Guest count** — how many people?
- **Style** — rustic barn, city hotel, country house, modern event space?`,quickReplies:["London","South East","North West","Scotland","Other UK"]}:e.includes("timeline")||e.includes("checklist")||e.includes("schedule")?{content:`Here's a general planning timeline for ${t.eventType||"your event"}:

**12+ months before**
- Set budget and guest list
- Book venue
- Hire photographer/videographer

**6–12 months before**
- Send save-the-dates
- Book catering, entertainment, florist
- Arrange accommodation for guests if needed

**2–6 months before**
- Send formal invitations
- Confirm all suppliers
- Plan decor and layout

**1 month before**
- Final headcount to caterers
- Confirm day-of schedule with all suppliers
- Prepare payments

Would you like a personalised checklist based on your specific event?`,quickReplies:["Get personalised checklist","Find suppliers","Budget breakdown","Talk to an expert"]}:e.includes("supplier")||e.includes("caterer")||e.includes("photographer")||e.includes("florist")||e.includes("dj")||e.includes("band")?{content:`I can help you find the right suppliers! To give you relevant recommendations I need to know:

- Your **location** (county or city)
- Your **event type** and **date**
- Your **budget** for this category

What details can you share?`,quickReplies:["Share location","Share event type","Share budget","Browse categories"]}:e.includes("london")||e.includes("scotland")||e.includes("wales")||e.includes("manchester")||e.includes("birmingham")||e.includes("yorkshire")?{content:`${t.location||"that area"} is a great choice with plenty of venues and suppliers to choose from. 📍

What type of event are you planning, and roughly how many guests?`,quickReplies:t.eventType?["Share guest count","Share budget","Find venues","Find suppliers"]:["Wedding","Birthday","Corporate","Party"]}:t.eventType?t.budget?t.location?{content:`I can help with many aspects of planning your ${t.eventType||"event"}. What would you like to focus on?`,quickReplies:["Venues","Budget breakdown","Supplier search","Planning timeline"]}:{content:`Almost there! Where will your ${t.eventType} be held? Knowing the region helps me point you to relevant venues and suppliers.`,quickReplies:["London","South East","North West","Scotland","Other UK"]}:{content:`To give you the most useful advice for your ${t.eventType}, it helps to know your approximate budget. What range are you working with?`,quickReplies:["Under £5k","£5k–£10k","£10k–£20k","£20k–£50k","£50k+"]}:{content:"I'm here to help with all aspects of event planning — venues, budgets, suppliers, timelines, and more. To get started, what type of event are you planning?",quickReplies:["Wedding","Birthday Party","Corporate Event","Anniversary","Other"]}}}function b(o,e,t,s,i,a,n,d,h,c){return`
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :host {
      all: initial;
      display: block;
      font-family: ${t};
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      
      /* CSS Custom Properties for positioning - can be overridden by consumers */
      --jade-offset-bottom: ${s};
      --jade-offset-right: ${i};
      --jade-offset-left: ${a};
      --jade-scale: ${c};
      --jade-primary-color: ${o};
      --jade-accent-color: ${e};
    }

    .jade-widget-container {
      position: fixed;
      bottom: var(--jade-offset-bottom, ${s});
      ${a?`left: var(--jade-offset-left, ${a});`:`right: var(--jade-offset-right, ${i});`}
      ${a?"right: auto;":""}
      z-index: 999999;
      transform: scale(var(--jade-scale, ${c}));
      transform-origin: ${a?"left":"right"} bottom;
    }

    /* Avatar Button */
    .jade-avatar-button {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--jade-primary-color, ${o}) 0%, var(--jade-accent-color, ${e}) 100%);
      border: 3px solid white;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: float 3s ease-in-out infinite;
      /* Larger tap target using pseudo-element */
      overflow: visible;
    }

    /* Larger invisible tap target for better mobile UX */
    .jade-avatar-button::before {
      content: '';
      position: absolute;
      top: -20px;
      left: -20px;
      right: -20px;
      bottom: -20px;
      border-radius: 50%;
      /* Ensures tap events are captured in the expanded area */
    }

    .jade-avatar-button:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    .jade-avatar-button:active {
      transform: translateY(0) scale(0.98);
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    .jade-avatar-icon {
      width: 100%;
      height: 100%;
      color: white;
      font-size: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .jade-avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${o} 0%, ${e} 100%);
    }

    .jade-avatar-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background: #ef4444;
      border: 2px solid white;
      color: white;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      animation: badgePulse 2s ease-in-out infinite;
    }

    @keyframes badgePulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    /* Greeting Tooltip */
    .jade-greeting-tooltip {
      position: absolute;
      bottom: 84px;
      ${a?"left: 0;":"right: 0;"}
      background: white;
      padding: 18px 22px;
      border-radius: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
      max-width: 300px;
      opacity: 0;
      transform: translateY(10px);
      animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .jade-greeting-tooltip:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2), 0 6px 16px rgba(0, 0, 0, 0.12);
    }

    @keyframes slideUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .jade-greeting-tooltip::after {
      content: '';
      position: absolute;
      bottom: -8px;
      ${a?"left: 24px;":"right: 24px;"}
      width: 16px;
      height: 16px;
      background: white;
      transform: rotate(45deg);
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.08);
      border-right: 1px solid rgba(0, 0, 0, 0.05);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .jade-greeting-text {
      position: relative;
      z-index: 1;
      font-size: 15px;
      color: #374151;
      line-height: 1.6;
      font-weight: 500;
    }

    .jade-greeting-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: #9ca3af;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0;
      z-index: 2;
    }

    .jade-greeting-close:hover {
      color: #4b5563;
    }

    /* Chat Popup */
    .jade-chat-popup {
      position: absolute;
      bottom: 84px;
      ${a?"left: 0;":"right: 0;"}
      width: 400px;
      height: 600px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      animation: popupOpen 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      border: 1px solid rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    @keyframes popupOpen {
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Header */
    .jade-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      background: linear-gradient(135deg, ${o} 0%, ${e} 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .jade-chat-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .jade-chat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .jade-chat-title {
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .jade-chat-status {
      font-size: 13px;
      opacity: 0.95;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .jade-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      display: inline-block;
      animation: statusPulse 2s ease-in-out infinite;
    }

    @keyframes statusPulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    .jade-chat-controls {
      display: flex;
      gap: 8px;
    }

    .jade-chat-minimize,
    .jade-chat-close {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      transition: background 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jade-chat-minimize:hover,
    .jade-chat-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Messages */
    .jade-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f9fafb;
    }

    .jade-chat-messages::-webkit-scrollbar {
      width: 6px;
    }

    .jade-chat-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .jade-chat-messages::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    .jade-message {
      display: flex;
      gap: 8px;
      animation: messageSlide 0.3s ease;
    }

    @keyframes messageSlide {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .jade-message-user {
      flex-direction: row-reverse;
    }

    .jade-message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .jade-message-avatar.assistant {
      background: linear-gradient(135deg, ${o} 0%, ${e} 100%);
      color: white;
    }

    .jade-message-avatar.user {
      background: #e5e7eb;
      color: #6b7280;
    }

    .jade-message-content {
      max-width: 70%;
    }

    .jade-message-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      word-wrap: break-word;
    }

    .jade-message-assistant .jade-message-bubble {
      background: white;
      color: #1f2937;
      border-bottom-left-radius: 4px;
    }

    .jade-message-user .jade-message-bubble {
      background: ${o};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .jade-message-time {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
      padding: 0 4px;
    }

    /* Markdown rendering styles */
    .jade-md-list {
      margin: .25em 0 .25em 1.2em;
      padding: 0;
    }

    .jade-inline-code {
      background: rgba(0,0,0,.08);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: .9em;
      font-family: monospace;
    }

    /* Quick Replies */
    .jade-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .jade-quick-reply-btn {
      padding: 8px 16px;
      border: 1px solid ${o};
      background: white;
      color: ${o};
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .jade-quick-reply-btn:hover {
      background: ${o};
      color: white;
    }

    /* Input Area */
    .jade-chat-input-area {
      padding: 16px 20px;
      background: white;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 16px 16px;
    }

    .jade-chat-input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .jade-chat-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      resize: none;
      max-height: 100px;
      min-height: 40px;
    }

    .jade-chat-input:focus {
      border-color: ${o};
      box-shadow: 0 0 0 3px rgba(11, 128, 115, 0.1);
    }

    .jade-char-count {
      font-size: 11px;
      color: #9ca3af;
      text-align: right;
      margin-top: 4px;
      height: 16px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .jade-char-count-visible {
      opacity: 1;
    }

    .jade-chat-send-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: ${o};
      color: white;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .jade-chat-send-btn:hover:not(:disabled) {
      background: ${e};
      transform: scale(1.05);
    }

    .jade-chat-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Loading indicator */
    .jade-typing-indicator {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
    }

    .jade-typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      animation: typing 1.4s infinite;
    }

    .jade-typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .jade-typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.7;
      }
      30% {
        transform: translateY(-10px);
        opacity: 1;
      }
    }

    /* Responsive */
    @media (max-width: 480px) {
      :host {
        /* Mobile-specific CSS custom properties */
        --jade-offset-bottom: ${n||s};
        --jade-offset-right: ${d||(i==="24px"?"16px":i)};
        --jade-offset-left: ${h||(a&&a==="24px"?"16px":a)};
      }
      
      .jade-widget-container {
        bottom: var(--jade-offset-bottom);
        ${a?"left: var(--jade-offset-left);":"right: var(--jade-offset-right);"}
        ${a?"right: auto;":""}
      }

      .jade-chat-popup {
        width: calc(100vw - 32px);
        /* Fallback for browsers without dvh or min() support */
        max-height: 600px;
        /* Fallback for browsers without dvh support */
        height: min(600px, calc(100vh - 120px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)));
        /* Modern browsers with dvh support - prevents cut-off on mobile */
        height: min(600px, calc(100dvh - 120px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)));
      }

      .jade-greeting-tooltip {
        max-width: calc(100vw - 120px);
      }
    }

    /* Hidden utility */
    .jade-hidden {
      display: none !important;
    }
  `}class y{constructor(e={}){this.config={...u,...e},this.apiClient=new v(this.config.apiBaseUrl,this.config.authToken),this.config.debug&&(console.log("[JadeWidget] Initializing with config:",this.config),console.log("[JadeWidget] Avatar URL:",this.config.avatarUrl)),this.escapeKeyHandler=a=>{a.key==="Escape"&&this.state.isOpen&&this.closeChat()};const t=r.loadState(),s=r.loadMessages(),i=r.loadConversationId();this.state={isOpen:t.isOpen||!1,isMinimized:t.isMinimized||!1,showGreeting:!1,conversationId:i||void 0,messages:s.length>0?s:this.getInitialMessages()},this.container=document.createElement("div"),this.container.className="jade-widget-root",this.shadowRoot=this.container.attachShadow({mode:"open"}),this.render(),this.attachEventListeners()}getInitialMessages(){return[{id:"initial",role:"assistant",content:this.config.greetingText,timestamp:Date.now(),quickReplies:["Yes, please","No, thanks"]}]}render(){const e=b(this.config.primaryColor,this.config.accentColor,this.config.fontFamily,this.config.offsetBottom,this.config.offsetRight,this.config.offsetLeft,this.config.offsetBottomMobile,this.config.offsetRightMobile,this.config.offsetLeftMobile,this.config.scale);this.shadowRoot.innerHTML=`
      <style>${e}</style>
      <div class="jade-widget-container">
        ${this.renderAvatar()}
        ${this.state.showGreeting&&!this.state.isOpen?this.renderGreeting():""}
        ${this.state.isOpen?this.renderChatPopup():""}
      </div>
    `}renderAvatar(){const e=this.config.avatarUrl?`<img src="${this.escapeHtml(this.config.avatarUrl)}" alt="Chat Assistant" class="jade-avatar-icon jade-avatar-img" />
         <span class="jade-avatar-icon jade-avatar-fallback" style="display:none;">💬</span>`:'<span class="jade-avatar-icon">💬</span>',t=this.state.showGreeting&&!this.state.isOpen?'<span class="jade-avatar-badge" aria-label="1 new notification">1</span>':"";return`
      <button class="jade-avatar-button" aria-label="Toggle chat" data-action="toggle-chat">
        ${e}
        ${t}
      </button>
    `}renderGreeting(){return`
      <div class="jade-greeting-tooltip" data-action="open-chat" role="tooltip" aria-live="polite">
        <button class="jade-greeting-close" aria-label="Dismiss greeting" data-action="close-greeting">×</button>
        <div class="jade-greeting-text">${this.escapeHtml(this.config.greetingTooltipText)}</div>
      </div>
    `}renderChatPopup(){return`
      <div class="jade-chat-popup" role="dialog" aria-label="Chat">
        ${this.renderHeader()}
        ${this.renderMessages()}
        ${this.renderInputArea()}
      </div>
    `}renderHeader(){return`
      <div class="jade-chat-header">
        <div class="jade-chat-header-left">
          <div class="jade-chat-avatar">
            ${this.config.avatarUrl?`<img src="${this.escapeHtml(this.config.avatarUrl)}" alt="${this.escapeHtml(this.config.assistantName)}" class="jade-header-avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`:"💬"}
          </div>
          <div>
            <div class="jade-chat-title">${this.escapeHtml(this.config.assistantName)}</div>
            <div class="jade-chat-status"><span class="jade-status-dot"></span>Online</div>
          </div>
        </div>
        <div class="jade-chat-controls">
          <button class="jade-chat-minimize" aria-label="Minimize chat" data-action="minimize-chat" title="Minimize">−</button>
          <button class="jade-chat-close" aria-label="Close chat" data-action="close-chat" title="Close">×</button>
        </div>
      </div>
    `}renderMessages(){return`
      <div class="jade-chat-messages" data-messages-container>
        ${this.state.messages.map(t=>this.renderMessage(t)).join("")}
      </div>
    `}renderMessage(e){const t=e.role==="user",s=new Date(e.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),i=!t&&e.quickReplies?`
      <div class="jade-quick-replies">
        ${e.quickReplies.map(n=>`<button class="jade-quick-reply-btn" data-action="quick-reply" data-reply="${this.escapeHtml(n)}">${this.escapeHtml(n)}</button>`).join("")}
      </div>
    `:"",a=t?this.escapeHtml(e.content):this.renderMarkdown(e.content);return`
      <div class="jade-message jade-message-${e.role}" data-message-id="${e.id}">
        <div class="jade-message-avatar ${e.role}">
          ${t?"👤":"💬"}
        </div>
        <div class="jade-message-content">
          <div class="jade-message-bubble">${a}</div>
          <div class="jade-message-time">${s}</div>
          ${i}
        </div>
      </div>
    `}renderMarkdown(e){const i=this.escapeHtml(e).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*([^*\n]+?)\*/g,(h,c)=>`<em>${c}</em>`).replace(/`([^`\n]+?)`/g,'<code class="jade-inline-code">$1</code>').split(`
`),a=[];let n=!1,d=null;for(let h=0;h<i.length;h++){const c=i[h],m=/^[-*•]\s+(.*)/.exec(c),f=/^\d+\.\s+(.*)/.exec(c);m?((!n||d!=="ul")&&(n&&a.push(d==="ol"?"</ol>":"</ul>"),a.push('<ul class="jade-md-list">'),n=!0,d="ul"),a.push(`<li>${m[1]}</li>`)):f?((!n||d!=="ol")&&(n&&a.push(d==="ul"?"</ul>":"</ol>"),a.push('<ol class="jade-md-list">'),n=!0,d="ol"),a.push(`<li>${f[1]}</li>`)):(n&&(a.push(d==="ol"?"</ol>":"</ul>"),n=!1,d=null),c.trim()===""?a.push("<br>"):a.push(c))}return n&&a.push(d==="ol"?"</ol>":"</ul>"),a.join(`
`)}renderInputArea(){return`
      <div class="jade-chat-input-area">
        <div class="jade-chat-input-wrapper">
          <textarea 
            class="jade-chat-input" 
            placeholder="Type your message..."
            rows="1"
            aria-label="Message input"
            maxlength="1000"
            data-input
          ></textarea>
          <button class="jade-chat-send-btn" aria-label="Send message" data-action="send" title="Send">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 1L7 9M15 1L10 15L7 9M15 1L1 6L7 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="jade-char-count" aria-live="polite" aria-atomic="true"></div>
      </div>
    `}attachEventListeners(){this.shadowRoot.addEventListener("click",s=>{const i=s.target,a=i.getAttribute("data-action");if(a==="toggle-chat")this.toggleChat();else if(a==="open-chat")this.openChat();else if(a==="close-chat")this.closeChat();else if(a==="minimize-chat")this.minimizeChat();else if(a==="close-greeting")s.stopPropagation(),this.closeGreeting();else if(a==="send")this.handleSend();else if(a==="quick-reply"){const n=i.getAttribute("data-reply");n&&this.handleQuickReply(n)}}),this.shadowRoot.addEventListener("keydown",s=>{const i=s;s.target.hasAttribute("data-input")&&i.key==="Enter"&&!i.shiftKey&&(s.preventDefault(),this.handleSend())}),document.addEventListener("keydown",this.escapeKeyHandler),this.shadowRoot.addEventListener("input",s=>{const i=s.target;if(i.hasAttribute("data-input")){i.style.height="auto",i.style.height=Math.min(i.scrollHeight,100)+"px";const a=this.shadowRoot.querySelector(".jade-char-count");if(a){const n=i.value.length;n>1e3*.8?(a.textContent=`${n}/1000`,a.classList.add("jade-char-count-visible")):(a.textContent="",a.classList.remove("jade-char-count-visible"))}}});const e=this.shadowRoot.querySelector(".jade-avatar-img");e&&(e.addEventListener("error",()=>{this.config.debug&&console.error("[JadeWidget] Failed to load avatar image:",this.config.avatarUrl),e.setAttribute("style","display:none;");const s=this.shadowRoot.querySelector(".jade-avatar-fallback");s&&s.setAttribute("style","display:flex;")}),e.addEventListener("load",()=>{this.config.debug&&console.log("[JadeWidget] Avatar image loaded successfully:",this.config.avatarUrl)}));const t=this.shadowRoot.querySelector(".jade-header-avatar-img");t&&(t.addEventListener("error",()=>{this.config.debug&&console.error("[JadeWidget] Failed to load header avatar image:",this.config.avatarUrl);const s=t.parentElement;s&&(s.innerHTML="💬")}),t.addEventListener("load",()=>{this.config.debug&&console.log("[JadeWidget] Header avatar image loaded successfully:",this.config.avatarUrl)}))}toggleChat(){this.state.isOpen?this.closeChat():this.openChat()}openChat(){this.state.isOpen=!0,this.state.showGreeting=!1,this.greetingTimeout&&clearTimeout(this.greetingTimeout),r.setGreetingDismissed(),r.saveState({isOpen:!0,showGreeting:!1}),this.render(),this.scrollToBottom(),this.focusInput()}closeChat(){this.state.isOpen=!1,r.saveState({isOpen:!1}),this.render()}minimizeChat(){this.state.isMinimized=!0,this.state.isOpen=!1,r.saveState({isOpen:!1,isMinimized:!0}),this.render()}closeGreeting(){this.state.showGreeting=!1,r.setGreetingDismissed(),this.render()}async handleSend(){const e=this.shadowRoot.querySelector("[data-input]");if(!e)return;const t=e.value.trim();if(!t)return;const s={id:"user-"+Date.now(),role:"user",content:t,timestamp:Date.now()};this.state.messages.push(s),r.saveMessages(this.state.messages),e.value="",e.style.height="auto",this.render(),this.scrollToBottom(),this.showTypingIndicator();try{const i=await this.apiClient.sendMessage(t,this.state.conversationId);this.state.conversationId||(this.state.conversationId=i.conversationId,r.saveConversationId(i.conversationId)),this.state.messages.push(i.message),r.saveMessages(this.state.messages),this.removeTypingIndicator(),this.render(),this.scrollToBottom(),this.focusInput()}catch(i){console.error("Failed to send message:",i),this.removeTypingIndicator();const a=i instanceof Error?i.message:"";let n;a.includes("429")||a.toLowerCase().includes("rate limit")?n="I'm getting a lot of requests right now — please wait a moment and try again. ⏳":a.includes("401")||a.includes("403")?n="I couldn't authenticate your request. Please refresh the page and try again.":a.includes("503")||a.includes("Failed to fetch")?n="I'm having trouble connecting right now. Please check your connection and try again.":n="I'm sorry, something went wrong. Please try again.";const d={id:"error-"+Date.now(),role:"assistant",content:n,timestamp:Date.now()};this.state.messages.push(d),r.saveMessages(this.state.messages),this.render(),this.scrollToBottom()}}handleQuickReply(e){const t=this.shadowRoot.querySelector("[data-input]");t&&(t.value=e,this.handleSend())}showTypingIndicator(){this.removeTypingIndicator();const e=this.shadowRoot.querySelector("[data-messages-container]");if(e){const t=document.createElement("div");t.className="jade-message jade-message-assistant",t.setAttribute("data-typing-indicator",""),t.innerHTML=`
        <div class="jade-message-avatar assistant">💬</div>
        <div class="jade-message-content">
          <div class="jade-message-bubble">
            <div class="jade-typing-indicator">
              <div class="jade-typing-dot"></div>
              <div class="jade-typing-dot"></div>
              <div class="jade-typing-dot"></div>
            </div>
          </div>
        </div>
      `,e.appendChild(t),this.scrollToBottom()}}removeTypingIndicator(){const e=this.shadowRoot.querySelector("[data-typing-indicator]");e&&e.remove()}scrollToBottom(){setTimeout(()=>{const e=this.shadowRoot.querySelector("[data-messages-container]");e&&(e.scrollTop=e.scrollHeight)},100)}focusInput(){setTimeout(()=>{const e=this.shadowRoot.querySelector("[data-input]");e&&e.focus()},100)}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}shouldShowGreeting(){const e=r.loadMessages(),t=e.length===0||e.length===1;return!this.state.isOpen&&t&&!r.isGreetingDismissed()}mount(e){(e||document.body).appendChild(this.container),this.shouldShowGreeting()&&(this.greetingTimeout=window.setTimeout(()=>{this.state.showGreeting=!0,this.render()},1e3))}unmount(){this.container.remove(),this.greetingTimeout&&clearTimeout(this.greetingTimeout),document.removeEventListener("keydown",this.escapeKeyHandler)}open(){this.openChat()}close(){this.closeChat()}toggle(){this.toggleChat()}reset(){r.clearAll(),this.state={isOpen:!1,isMinimized:!1,showGreeting:!1,messages:this.getInitialMessages()},this.render()}}function x(o){var t;(t=window.JadeWidget)!=null&&t.instance&&window.JadeWidget.instance.unmount();const e=(o==null?void 0:o.showDelayMs)??u.showDelayMs;setTimeout(()=>{const s=new y(o);s.mount(),window.JadeWidget&&(window.JadeWidget.instance=s)},e)}const g={init:x};typeof window<"u"&&(window.JadeWidget=g),p.default=g,Object.defineProperties(p,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}})})(this.JadeWidget=this.JadeWidget||{});
