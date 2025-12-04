
// This service handles local persistence using IndexedDB
// It allows the app to save data (including large image blobs) in the browser without a backend.

const DB_NAME = 'FilmPlusStudioDB';
const DB_VERSION = 1;

// Define Store Names
const STORES = {
  SCRIPTS: 'scripts',
  SCENES: 'scenes',
  SHOT_PROJECTS: 'shotProjects',
  SHOTS: 'shots',
  ASSETS: 'assets',
  IMAGES: 'images'
};

let dbPromise: Promise<IDBDatabase> | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Scripts Store
      if (!db.objectStoreNames.contains(STORES.SCRIPTS)) {
        db.createObjectStore(STORES.SCRIPTS, { keyPath: 'id' });
      }

      // Scenes Store (Indexed by scriptId)
      if (!db.objectStoreNames.contains(STORES.SCENES)) {
        const store = db.createObjectStore(STORES.SCENES, { keyPath: 'id' });
        store.createIndex('scriptId', 'scriptId', { unique: false });
      }

      // Shot Projects Store
      if (!db.objectStoreNames.contains(STORES.SHOT_PROJECTS)) {
        db.createObjectStore(STORES.SHOT_PROJECTS, { keyPath: 'id' });
      }

      // Shots Store (Indexed by projectId)
      if (!db.objectStoreNames.contains(STORES.SHOTS)) {
        const store = db.createObjectStore(STORES.SHOTS, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }

      // Assets Store
      if (!db.objectStoreNames.contains(STORES.ASSETS)) {
        db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
      }

      // Images Store
      if (!db.objectStoreNames.contains(STORES.IMAGES)) {
        db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

// Generic Helpers
const getTransaction = async (storeName: string, mode: IDBTransactionMode) => {
  const db = await initDB();
  return db.transaction(storeName, mode).objectStore(storeName);
};

// Helper to generate a dummy poster image
const getPosterBase64 = () => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#0a0a0c;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="800" height="450" fill="url(#grad)"/>
        <rect x="0" y="0" width="800" height="450" fill="none" stroke="#D6001C" stroke-width="20" opacity="0.1"/>
        <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="80" fill="#fff" letter-spacing="10">FILM++</text>
        <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="400" font-size="24" fill="#D6001C" letter-spacing="5">AI STUDIO DEMO</text>
        <circle cx="100" cy="100" r="2" fill="#fff" opacity="0.5" />
        <circle cx="700" cy="350" r="2" fill="#fff" opacity="0.5" />
        <path d="M 0 400 Q 400 350 800 400" stroke="#D6001C" stroke-width="2" fill="none" opacity="0.3"/>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
};

export const dbService = {
  // Generic Get All
  getAll: async <T>(storeName: string): Promise<T[]> => {
    const store = await getTransaction(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Generic Add/Put
  put: async <T>(storeName: string, item: T): Promise<void> => {
    const store = await getTransaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Generic Delete
  delete: async (storeName: string, id: string): Promise<void> => {
    const store = await getTransaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Get by Index (e.g., Get scenes by scriptId)
  getByIndex: async <T>(storeName: string, indexName: string, value: string): Promise<T[]> => {
    const store = await getTransaction(storeName, 'readonly');
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Seed Demo Data
  seedDemoData: async () => {
      const scripts = await dbService.getAll(STORES.SCRIPTS);
      if (scripts.length > 0) return; // Already seeded

      console.log("Seeding Demo Data...");

      // 1. Script
      const scriptId = crypto.randomUUID();
      const script = {
          id: scriptId,
          title: '霸道总裁爱上我',
          summary: '讲述了普通职员林小鹿与冷面总裁顾夜寒之间跨越阶级的爱情故事。',
          lastModified: new Date().toISOString().split('T')[0]
      };
      await dbService.put(STORES.SCRIPTS, script);

      // 2. Scene
      const sceneId = crypto.randomUUID();
      const scene = {
          id: sceneId,
          scriptId: scriptId,
          number: 1,
          intExt: '外',
          location: '顾氏集团大楼',
          time: '日',
          title: '初遇',
          content: '顾氏集团高耸入云的大楼下，林小鹿看着手中的入职通知书，深吸一口气。\n\n林小鹿\n(给自己打气)\n加油，林小鹿，你是最棒的！\n\n一辆黑色的劳斯莱斯幻影疾驰而来，停在大门口。车门打开，顾夜寒迈着修长的腿走下车，墨镜遮住了他冷峻的眼眸。\n\n周围的员工纷纷停下脚步，鞠躬致意。\n\n林小鹿看得出神，不小心撞到了旁边的花坛。'
      };
      await dbService.put(STORES.SCENES, scene);

      // 3. Shot Project
      const projectId = crypto.randomUUID();
      const project = {
          id: projectId,
          title: '霸道总裁爱上我 - 场 1 - 初遇',
          relatedScript: '霸道总裁爱上我',
          relatedScene: `场 1 - 初遇`,
          director: 'Demo User',
          date: new Date().toISOString().split('T')[0],
          shotCount: 3
      };
      await dbService.put(STORES.SHOT_PROJECTS, project);

      // 4. Shots
      const shots = [
          {
              id: crypto.randomUUID(), projectId: projectId, number: '1', order: 0,
              size: '全景', angle: '仰视', movement: '推镜头',
              description: '顾氏集团大楼外观，高耸入云，阳光折射在玻璃幕墙上。',
              dialogue: '', characters: '', sceneElement: '大楼, 阳光'
          },
          {
              id: crypto.randomUUID(), projectId: projectId, number: '2', order: 1,
              size: '中景', angle: '平视', movement: '固定',
              description: '林小鹿站在大楼前，手握通知书，神情紧张又期待。',
              dialogue: '加油，林小鹿，你是最棒的！', characters: '林小鹿', sceneElement: '入职通知书'
          },
          {
              id: crypto.randomUUID(), projectId: projectId, number: '3', order: 2,
              size: '特写', angle: '平视', movement: '慢动作',
              description: '黑色劳斯莱斯车门打开，顾夜寒的皮鞋落地，镜头上摇至他冷峻的侧脸。',
              dialogue: '', characters: '顾夜寒', sceneElement: '劳斯莱斯'
          }
      ];
      for (const s of shots) await dbService.put(STORES.SHOTS, s);

      // 5. Image (Poster)
      const image = {
          id: crypto.randomUUID(),
          url: getPosterBase64(),
          prompt: 'FILM++ STUDIO DEMO POSTER',
          aspectRatio: '16:9',
          timestamp: Date.now()
      };
      await dbService.put(STORES.IMAGES, image);
  },

  // Specific Stores Accessors
  stores: STORES
};
