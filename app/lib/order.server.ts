import type {Audience, Order, Zone} from '@prisma/client'
import {PaymentMethod} from '@prisma/client'
import {OrderStatus} from '@prisma/client'
import {PaymentStatus} from '@prisma/client'
import {db} from '~/db.server'

export function getAllOrders() {
	return db.order.findMany({
		include: {
			audience: {
				select: {
					name: true,
					email: true,
				},
			},
			payment: true,
			schedule: {
				include: {
					timeSlot: true,
					teamOne: true,
					stadium: true,
				},
			},
			tickets: true,
		},
	})
}

export function getOrdersById(audienceId: Audience['id']) {
	return db.order.findMany({
		where: {
			audienceId: audienceId,
		},
		orderBy: [
			{
				status: 'desc',
			},
			{
				createdAt: 'desc',
			},
		],
		include: {
			audience: {
				select: {
					name: true,
					email: true,
				},
			},
			payment: true,
			schedule: {
				include: {
					timeSlot: true,
					teamOne: true,
					stadium: true,
				},
			},
			tickets: true,
		},
	})
}

export function cancelOrder(
	orderId: Order['id'],
	status: OrderStatus = OrderStatus.CANCELLED_BY_ADMIN
) {
	return db.order.update({
		where: {id: orderId},
		data: {
			status,
			tickets: {
				deleteMany: {},
			},
			payment: {
				update: {
					status: PaymentStatus.REFUNDED,
				},
			},
		},
	})
}
// export function cancelOrder(
// 	orderId: Order['id'],
// 	status: OrderStatus = OrderStatus.REFUNDED // Set default to REFUNDED or any desired status
// ) {
// 	return db.order.update({
// 		where: { id: orderId },
// 		data: {
// 			status, // Use the status passed to the function, defaulting to REFUNDED
// 			tickets: {
// 				deleteMany: {}, // Remove all associated tickets
// 			},
// 			payment: {
// 				update: {
// 					status: PaymentStatus.REFUNDED, // Ensure payment status is set to REFUNDED
// 				},
// 			},
// 		},
// 	});
// }


const generateSeats = (zone: string, noOfTickets: number, offset = 0) => {
	const seats = []
	const shortZone = zone
		.split(' ')
		.map(word => word.charAt(0))
		.join('')

	// Ensure offset is a number
	// const numericOffset = Number.isFinite(offset) ? offset : 0

	for (let i = 1; i <= noOfTickets; i++) {
		seats.push(`${shortZone}${offset + i}`)
	}
	return seats
}

// export async function createOrder({
// 	audienceId,
// 	fixtureId,
// 	noOfTickets,
// 	zoneId,
// }: {
// 	zoneId: Zone['id']
// 	audienceId: Audience['id']
// 	fixtureId: Order['scheduleId']
// 	noOfTickets: Order['noOfTickets']
// }) {
// 	const fixture = await db.schedule.findUnique({
// 		where: {id: fixtureId},
// 		select: {
// 			orders: {
// 				include: {
// 					tickets: true,
// 				},
// 			},
// 		},
// 	})

// 	if (!fixture) {
// 		throw new Error('Fixture not found')
// 	}

// 	const zone = await db.zone.findUnique({
// 		where: {id: zoneId},
// 	})

// 	if (!zone) {
// 		throw new Error('Zone not found')
// 	}

// 	const totalAmount = zone.pricePerSeat * noOfTickets

// 	let lastSeat = 0
// 	const successfulOrders = fixture?.orders.filter(
// 		o => o.status === OrderStatus.SUCCESS
// 	)
// 	if (!successfulOrders || successfulOrders.length === 0) {
// 		//
// 	} else {
// 		const seatsAlloted = successfulOrders
// 			.map(o => o.tickets.map(t => t.seatNo))
// 			.flat()
// 		lastSeat = Math.max(...seatsAlloted.map(seat => Number(seat)))
// 	}

// 	const seats = generateSeats(zone.name, noOfTickets, lastSeat)

// 	return db.order.create({
// 		data: {
// 			audienceId,
// 			scheduleId: fixtureId,
// 			noOfTickets,
// 			status: OrderStatus.SUCCESS,
// 			tickets: {
// 				createMany: {
// 					data: seats.map(seat => ({seatNo: seat})),
// 				},
// 			},
// 			payment: {
// 				create: {
// 					audienceId,
// 					status: PaymentStatus.PAID,
// 					method: PaymentMethod.CREDIT_CARD,
// 					amount: totalAmount,
// 				},
// 			},
// 		},
// 	})
// }
export async function createOrder({
    audienceId,
    fixtureId,
    noOfTickets,
    zoneId,
}: {
    zoneId: Zone['id'];
    audienceId: Audience['id'];
    fixtureId: Order['scheduleId'];
    noOfTickets: Order['noOfTickets'];
}) {
    const fixture = await db.schedule.findUnique({
        where: { id: fixtureId },
        select: {
            orders: {
                include: {
                    tickets: true,
                },
            },
        },
    });

    if (!fixture) {
        throw new Error('Fixture not found');
    }

    const zone = await db.zone.findUnique({
        where: { id: zoneId },
    });

    if (!zone) {
        throw new Error('Zone not found');
    }

    // Calculate the total amount
    const totalAmount = zone.pricePerSeat * noOfTickets;

    // Determine the last seat number assigned
    const successfulOrders = fixture.orders.filter(
        o => o.status === OrderStatus.SUCCESS
    );

    const seatsAlloted = successfulOrders
        .flatMap(o => o.tickets.map(t => parseInt(t.seatNo.replace(/^\D+/g, ''), 10))) // Extract numeric part of seatNo
        .filter(Number.isFinite); // Ensure only valid numbers are included

    const lastSeat = seatsAlloted.length > 0 ? Math.max(...seatsAlloted) : 0;

    // Check if there are enough seats available
    if (noOfTickets + lastSeat > zone.size) {
        throw new Error('Not enough seats available in this zone');
    }

    // Generate seat numbers
    const seats = generateSeats(zone.name, noOfTickets, lastSeat);

    // Create the order
    return db.order.create({
        data: {
            audienceId,
            scheduleId: fixtureId,
            noOfTickets,
            status: OrderStatus.SUCCESS,
            tickets: {
                createMany: {
                    data: seats.map(seat => ({ seatNo: seat })),
                },
            },
            payment: {
                create: {
                    audienceId,
                    status: PaymentStatus.PAID,
                    method: PaymentMethod.CREDIT_CARD,
                    amount: totalAmount,
                },
            },
        },
    });
}

