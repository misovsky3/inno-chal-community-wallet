export type MembershipRole =
  | 'admin'
  | 'disponent'
  | 'payment_preparer'
  | 'controller'
  | 'read_only';

export type InvitationRole = Exclude<MembershipRole, 'admin'>;
