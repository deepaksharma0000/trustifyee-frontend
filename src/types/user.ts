import { CustomFile } from 'src/components/upload';

// ----------------------------------------------------------------------

export type IUserTableFilterValue = string | string[];

export type IUserTableFilters = {
  name: string;
  role: string[];
  status: string;
};

// ----------------------------------------------------------------------

export type IUserSocialLink = {
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
};

export type IUserProfileCover = {
  name: string;
  role: string;
  coverUrl: string;
  avatarUrl: string;
};

export type IUserProfile = {
  id: string;
  role: string;
  quote: string;
  email: string;
  school: string;
  country: string;
  company: string;
  totalFollowers: number;
  totalFollowing: number;
  socialLinks: IUserSocialLink;
};

export type IUserProfileFollower = {
  id: string;
  name: string;
  country: string;
  avatarUrl: string;
};

export type IUserProfileGallery = {
  id: string;
  title: string;
  imageUrl: string;
  postedAt: Date;
};

export type IUserProfileFriend = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
};

export type IUserProfilePost = {
  id: string;
  media: string;
  message: string;
  createdAt: Date;
  personLikes: {
    name: string;
    avatarUrl: string;
  }[];
  comments: {
    id: string;
    message: string;
    createdAt: Date;
    author: {
      id: string;
      name: string;
      avatarUrl: string;
    };
  }[];
};

export type IUserCard = {
  id: string;
  name: string;
  role: string;
  coverUrl: string;
  avatarUrl: string;
  totalPosts: number;
  totalFollowers: number;
  totalFollowing: number;
};

export interface IUserItem {
  id: string; // Required in many components
  _id?: string;
  name?: string;
  user_name?: string;
  fullname?: string;
  full_name?: string;

  email: string;
  phone_number?: string;
  phoneNumber?: string;

  role?: string;
  status?: string;

  broker?: string | null;
  trading_status?: 'enabled' | 'disabled';
  tradingStatus?: 'active' | 'inactive';
  licence?: 'Live' | 'Demo';
  sub_admin?: string;
  group_service?: string;
  to_month?: string;
  month?: string;
  service_to_month?: string;
  start_date?: Date | string;
  startdate?: Date | string;
  end_date?: Date | string;
  enddate?: Date | string;
  avatar_color?: string;
  is_login?: boolean;
  is_online?: boolean;
  broker_verified?: boolean;
  brokerVerified?: boolean;
  is_star?: boolean;

  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  isVerified?: boolean;
  isOnline?: boolean;
  avatarUrl?: string;
  company?: string;
  createdAt?: Date | string;
}


export type IUserAccount = {
  email: string;
  isPublic: boolean;
  displayName: string;
  city: string | null;
  state: string | null;
  about: string | null;
  country: string | null;
  address: string | null;
  zipCode: string | null;
  phoneNumber: string | null;
  photoURL: CustomFile | string | null;
};

export type IUserAccountBillingHistory = {
  id: string;
  price: number;
  createdAt: Date;
  invoiceNumber: string;
};

export type IUserAccountChangePassword = {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};
