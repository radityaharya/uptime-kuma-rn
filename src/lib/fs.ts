import { StorageAccessFramework } from 'expo-file-system';

import { getItem, setItem } from './storage';

const savePermissionGrantedFolderURI = async (uri: string) => {
  setItem("granted-permission-folder", uri);
};

export const getPermissionGrantedFolderURI =  async (): Promise<string | null> => {
  return await getItem("granted-permission-folder") as string;
};


export const checkAndGetPermissionGrantedFolderURI = async() => {
  const uri = await getPermissionGrantedFolderURI();

  if (uri) {
    try {
      const fileInfo = await StorageAccessFramework.readDirectoryAsync(uri);
      if (Array.isArray(fileInfo)) {
        return uri;
      }
    } catch (error) {
      // if not found or invalid, get the permission again by continuing
    }
  }

  const permissions =
    await StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (permissions.granted) {
    await savePermissionGrantedFolderURI(permissions.directoryUri);
    return permissions.directoryUri;
  }

  return null;
};