module blobcast::tipping {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::object::ID;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use blobcast::events;

    /// Facilitates on-chain tipping, verifiably splitting and transferring SUI coins to the post creator.
    public entry fun tip_creator(
        recipient: address,
        post_id: ID,
        tip_coin: &mut Coin<SUI>,
        amount: u64,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = sui::clock::timestamp_ms(clock);

        // Split the specified SUI amount from the user's SUI coin object
        let split_coin = coin::split(tip_coin, amount, ctx);

        // Transfer the split coin directly to the recipient's wallet
        transfer::public_transfer(split_coin, recipient);

        // Emit indexer telemetry event
        events::emit_tip_event(sender, recipient, amount, post_id, timestamp);
    }
}
