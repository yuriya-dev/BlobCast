module blobcast::profile {
    use std::string::String;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use blobcast::events;

    /// Sovereign identity profile object owned by the creator.
    public struct Profile has key, store {
        id: UID,
        owner: address,
        username: String,
        walrus_avatar_blob: String,
        walrus_banner_blob: String,
        bio_blob: String,
        created_at: u64,
        verified: bool
    }

    /// Registers a new profile and transfers absolute ownership to the tx sender.
    public entry fun create_profile(
        username: String,
        walrus_avatar_blob: String,
        walrus_banner_blob: String,
        bio_blob: String,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let id = object::new(ctx);
        let profile_id = object::uid_to_inner(&id);
        let created_at = sui::clock::timestamp_ms(clock);

        let profile = Profile {
            id,
            owner: sender,
            username,
            walrus_avatar_blob,
            walrus_banner_blob,
            bio_blob,
            created_at,
            verified: false
        };

        // Transfer the Profile object directly to the caller's wallet
        transfer::transfer(profile, sender);

        // Emit verified indexing event
        events::emit_profile_created(profile_id, sender, username, created_at);
    }

    /// Updates existing profile parameters (avatar, banner, and bio references).
    public entry fun update_profile(
        profile: &mut Profile,
        walrus_avatar_blob: String,
        walrus_banner_blob: String,
        bio_blob: String,
        ctx: &mut TxContext
    ) {
        // Enforce owner signature validation
        assert!(profile.owner == tx_context::sender(ctx), 0);

        profile.walrus_avatar_blob = walrus_avatar_blob;
        profile.walrus_banner_blob = walrus_banner_blob;
        profile.bio_blob = bio_blob;
    }

    /// Grants verification checkmark status to a profile (governance/moderator action).
    public entry fun verify_profile(
        profile: &mut Profile,
        status: bool,
        _ctx: &mut TxContext
    ) {
        // Governance verify logic (could be gated to package admins)
        profile.verified = status;
    }

    // --- Getters ---
    public fun get_username(profile: &Profile): &String {
        &profile.username
    }

    public fun get_owner(profile: &Profile): address {
        profile.owner
    }

    public fun is_verified(profile: &Profile): bool {
        profile.verified
    }
}
