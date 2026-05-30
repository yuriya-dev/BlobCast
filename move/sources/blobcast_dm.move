module blobcast::blobcast_dm {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    const ENoAccess: u64 = 1;

    /// Shared conversation access policy object
    public struct Conversation has key, store {
        id: UID,
        participant1: address,
        participant2: address,
    }

    /// Creates a new E2E encrypted conversation on-chain and shares it.
    public entry fun create_conversation(participant2: address, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let conversation = Conversation {
            id: object::new(ctx),
            participant1: sender,
            participant2,
        };
        transfer::share_object(conversation);
    }

    /// Access control policy check for Seal decryption.
    /// The function name must start with `seal_approve` to be recognized by Seal key servers.
    public entry fun seal_approve(
        _key_id: vector<u8>,
        conversation: &Conversation,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(
            sender == conversation.participant1 || sender == conversation.participant2,
            ENoAccess
        );
    }
}
