import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getStoredProjects, saveStoredProjects } from './projectService';
import { getStoredUsersList, saveStoredUsersList } from './authService';
import { getStoredCamps, saveStoredCamps } from './campService';
import { User, Project, Camp } from '../types';

let isSyncing = false;

export const firebaseSyncService = {
  /**
   * Initializes synchronization between Cloud Firestore and local storage.
   * If Firestore has data, it updates local cache.
   * If Firestore is empty, it uploads initial data from the app.
   */
  async initSync(): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
      // 1. Sync Users
      await this.syncUsers();
      // 2. Sync Projects
      await this.syncProjects();
      // 3. Sync Camps
      await this.syncCamps();
    } catch (err) {
      console.warn('Firebase initial sync notice (offline or first run):', err);
    } finally {
      isSyncing = false;
    }
  },

  async syncUsers(): Promise<void> {
    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);

      if (!snapshot.empty) {
        const cloudUsers: User[] = [];
        snapshot.forEach((d) => {
          cloudUsers.push(d.data() as User);
        });
        saveStoredUsersList(cloudUsers);
      } else {
        // Upload initial users to Firestore
        const localUsers = getStoredUsersList();
        const batch = writeBatch(db);
        localUsers.forEach((u) => {
          const ref = doc(db, 'users', u.id);
          batch.set(ref, u);
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Failed to sync users with Firestore:', err);
    }
  },

  async saveUserToFirestore(user: User): Promise<void> {
    try {
      const ref = doc(db, 'users', user.id);
      await setDoc(ref, user, { merge: true });
    } catch (err) {
      console.warn('Error saving user to Firestore:', err);
    }
  },

  async syncProjects(): Promise<void> {
    try {
      const projectsCol = collection(db, 'projects');
      const snapshot = await getDocs(projectsCol);

      if (!snapshot.empty) {
        const cloudProjects: Project[] = [];
        snapshot.forEach((d) => {
          cloudProjects.push(d.data() as Project);
        });
        saveStoredProjects(cloudProjects);
      } else {
        const localProjects = getStoredProjects();
        const batch = writeBatch(db);
        localProjects.forEach((p) => {
          const ref = doc(db, 'projects', p.id);
          batch.set(ref, p);
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Failed to sync projects with Firestore:', err);
    }
  },

  async saveProjectToFirestore(project: Project): Promise<void> {
    try {
      const ref = doc(db, 'projects', project.id);
      await setDoc(ref, project, { merge: true });
    } catch (err) {
      console.warn('Error saving project to Firestore:', err);
    }
  },

  async syncCamps(): Promise<void> {
    try {
      const campsCol = collection(db, 'camps');
      const snapshot = await getDocs(campsCol);

      if (!snapshot.empty) {
        const cloudCamps: Camp[] = [];
        snapshot.forEach((d) => {
          cloudCamps.push(d.data() as Camp);
        });
        saveStoredCamps(cloudCamps);
      } else {
        const localCamps = getStoredCamps();
        const batch = writeBatch(db);
        localCamps.forEach((c) => {
          const ref = doc(db, 'camps', c.id);
          batch.set(ref, c);
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Failed to sync camps with Firestore:', err);
    }
  },

  async saveCampToFirestore(camp: Camp): Promise<void> {
    try {
      const ref = doc(db, 'camps', camp.id);
      await setDoc(ref, camp, { merge: true });
    } catch (err) {
      console.warn('Error saving camp to Firestore:', err);
    }
  }
};
