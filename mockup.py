import json
import random
from datetime import datetime, timedelta

def generate_mockup_data():
    data = []
    start_date = datetime(2023, 10, 1)
    end_date = datetime.now()

    for _ in range(20):
        lot_id = f"Y{random.randint(10000, 99999)}TL.{random.randint(0, 12):02d}"
        for machine_id in range(3, 11):
            for direction in ["in", "out"]:
                assy_input = random.randint(18000, 20000)
                good = random.randint(5000, 6000)
                ng = random.randint(0, 30)
                substrate = 0
                ttl = good + ng
                timestamp = (start_date + timedelta(seconds=random.randint(0, int((end_date - start_date).total_seconds())))).strftime('%Y-%m-%d %H:%M:%S')
                badmark = 0
                count_id = 1

                entry = {
                    "ASSY_input": assy_input,
                    "Direction": direction,
                    "Good": good,
                    "Lot_id": lot_id,
                    "Machine_ID": machine_id,
                    "NG": ng,
                    "Substrate": substrate,
                    "TTL": ttl,
                    "Timestamp": timestamp,
                    "badmark": badmark,
                    "count_id": count_id
                }
                data.append(entry)

    return data

if __name__ == "__main__":
    mockup_data = generate_mockup_data()
    with open("mockup_data.json", "w") as json_file:
        json.dump(mockup_data, json_file, indent=4)

    print("Data written to mockup_data.json")



# UPDATE Business_id and Judgement column

# UPDATE countrecords_counttray
# SET Business_id = 1
# WHERE Business_id IS NULL;

# UPDATE countrecords_counttray
# SET Judgement = 'Correct';

